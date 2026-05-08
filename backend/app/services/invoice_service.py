from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Any
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domain.models.accounting import JournalSource
from app.domain.models.booking import Booking
from app.domain.models.finance import ExpenseRecord, FinanceCategory, RevenueRecord
from app.domain.models.invoice import (
    Invoice,
    InvoiceLine,
    InvoiceLineType,
    InvoicePayment,
    InvoicePaymentMethod,
    InvoiceRecipientType,
    InvoiceSequence,
    InvoiceStatus,
)
from app.domain.models.property_management import ContractStatus, Owner, UnitManagementContract
from app.domain.models.unit import Unit
from app.domain.schemas.invoice import GenerateBookingInvoiceRequest, InvoicePaymentCreate, OwnerStatementRequest
from app.services.accounting_service import AccountingService


MONEY = Decimal("0.01")


class InvoiceService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.accounting = AccountingService(session)

    def _money(self, value: Any) -> Decimal:
        return Decimal(str(value or 0)).quantize(MONEY, rounding=ROUND_HALF_UP)

    def _invoice_query(self):
        return select(Invoice).options(
            selectinload(Invoice.lines),
            selectinload(Invoice.payments),
            selectinload(Invoice.customer),
            selectinload(Invoice.owner),
            selectinload(Invoice.unit),
            selectinload(Invoice.booking),
        )

    async def _next_invoice_number(self, recipient_type: InvoiceRecipientType) -> str:
        bind = self.session.get_bind()
        if bind and bind.dialect.name == "postgresql":
            await self.session.execute(select(func.pg_advisory_xact_lock(42102001)))
        sequence_key = recipient_type.value
        prefix = "CINV" if recipient_type == InvoiceRecipientType.CUSTOMER else "OSTM"
        sequence = (
            await self.session.execute(
                select(InvoiceSequence)
                .where(InvoiceSequence.sequence_key == sequence_key)
                .with_for_update()
            )
        ).scalar_one_or_none()
        if not sequence:
            sequence = InvoiceSequence(sequence_key=sequence_key, prefix=prefix, next_number=1)
            self.session.add(sequence)
            await self.session.flush()
        invoice_number = f"{sequence.prefix}-{date.today().year}-{sequence.next_number:06d}"
        sequence.next_number += 1
        await self.session.flush()
        return invoice_number

    async def get_invoice(self, invoice_id: UUID) -> Invoice:
        invoice = (await self.session.execute(self._invoice_query().where(Invoice.id == invoice_id))).scalar_one_or_none()
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        return invoice

    async def list_invoices(
        self,
        skip: int = 0,
        limit: int = 20,
        recipient_type: InvoiceRecipientType | None = None,
        status: InvoiceStatus | None = None,
        unit_id: UUID | None = None,
        customer_id: UUID | None = None,
        owner_id: UUID | None = None,
    ):
        filters = []
        if recipient_type:
            filters.append(Invoice.recipient_type == recipient_type)
        if status:
            filters.append(Invoice.status == status)
        if unit_id:
            filters.append(Invoice.unit_id == unit_id)
        if customer_id:
            filters.append(Invoice.customer_id == customer_id)
        if owner_id:
            filters.append(Invoice.owner_id == owner_id)
        query = self._invoice_query()
        count_query = select(func.count()).select_from(Invoice)
        for condition in filters:
            query = query.where(condition)
            count_query = count_query.where(condition)
        total = (await self.session.execute(count_query)).scalar_one()
        result = await self.session.execute(query.order_by(Invoice.issue_date.desc(), Invoice.created_at.desc()).offset(skip).limit(limit))
        return result.scalars().all(), total

    async def generate_customer_invoice_from_booking(
        self,
        booking_id: UUID,
        data: GenerateBookingInvoiceRequest | None = None,
        created_by: UUID | None = None,
        commit: bool = True,
    ) -> Invoice:
        existing = (
            await self.session.execute(
                self._invoice_query().where(
                    Invoice.booking_id == booking_id,
                    Invoice.recipient_type == InvoiceRecipientType.CUSTOMER,
                    Invoice.status != InvoiceStatus.CANCELLED,
                )
            )
        ).scalar_one_or_none()
        if existing:
            return existing

        booking = (
            await self.session.execute(
                select(Booking)
                .options(selectinload(Booking.unit), selectinload(Booking.customer))
                .where(Booking.id == booking_id)
            )
        ).scalar_one_or_none()
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        unit = booking.unit
        if not unit:
            raise HTTPException(status_code=404, detail="Unit not found")

        issue_date = data.issue_date if data and data.issue_date else date.today()
        due_date = data.due_date if data else None
        accommodation = self._money(booking.total_cost)
        tax = self._money(booking.tax_amount)
        deposit = self._money(booking.deposit_amount)
        subtotal = accommodation + deposit
        total = subtotal + tax
        amount_paid = min(self._money(booking.amount_paid), total)
        status_value = self._resolve_status(total, amount_paid, due_date)

        invoice = Invoice(
            invoice_number=await self._next_invoice_number(InvoiceRecipientType.CUSTOMER),
            recipient_type=InvoiceRecipientType.CUSTOMER,
            status=status_value,
            customer_id=booking.customer_id,
            booking_id=booking.id,
            unit_id=booking.unit_id,
            owner_id=unit.owner_id,
            issue_date=issue_date,
            due_date=due_date,
            period_start=booking.check_in,
            period_end=booking.check_out,
            subtotal=subtotal,
            tax_amount=tax,
            total_amount=total,
            amount_paid=amount_paid,
            notes="Generated from booking checkout",
        )
        invoice.lines = [
            InvoiceLine(
                line_type=InvoiceLineType.ACCOMMODATION,
                description=f"Accommodation {booking.check_in.isoformat()} to {booking.check_out.isoformat()}",
                quantity=1,
                unit_price=accommodation,
                total_amount=accommodation,
                service_period_start=booking.check_in,
                service_period_end=booking.check_out,
            )
        ]
        if tax > 0:
            invoice.lines.append(
                InvoiceLine(line_type=InvoiceLineType.TAX, description="Tax", quantity=1, unit_price=tax, tax_amount=tax, total_amount=tax)
            )
        if deposit > 0:
            invoice.lines.append(
                InvoiceLine(line_type=InvoiceLineType.DEPOSIT, description="Refundable deposit", quantity=1, unit_price=deposit, total_amount=deposit)
            )
        invoice.payments = []
        if amount_paid > 0:
            invoice.payments = [
                InvoicePayment(
                    payment_date=issue_date,
                    amount=amount_paid,
                    method=InvoicePaymentMethod.CASH,
                    notes="Payment imported from booking",
                )
            ]
        self.session.add(invoice)
        await self.session.flush()

        admin_fee = await self._management_fee_amount(unit, booking.check_out, accommodation)
        invoice_entry = await self._post_customer_invoice(invoice, booking, unit, accommodation, tax, deposit, admin_fee, created_by)
        invoice.journal_entry_id = invoice_entry.id
        for payment in invoice.payments:
            payment_entry = await self._post_invoice_payment(invoice, payment, booking, unit, created_by)
            payment.journal_entry_id = payment_entry.id

        await self._create_booking_revenue_record(booking, accommodation, invoice_entry.id, created_by)
        await self.session.flush()
        if commit:
            await self.session.commit()
            return await self.get_invoice(invoice.id)
        return invoice

    async def add_payment(self, invoice_id: UUID, data: InvoicePaymentCreate, created_by: UUID | None = None) -> Invoice:
        invoice = await self.get_invoice(invoice_id)
        if invoice.status == InvoiceStatus.CANCELLED:
            raise HTTPException(status_code=422, detail="Cannot pay a cancelled invoice")
        payment = InvoicePayment(**data.model_dump(), invoice_id=invoice.id)
        self.session.add(payment)
        await self.session.flush()
        booking = invoice.booking
        unit = invoice.unit
        if not unit:
            raise HTTPException(status_code=422, detail="Invoice payment requires a unit")
        entry = await self._post_invoice_payment(invoice, payment, booking, unit, created_by)
        payment.journal_entry_id = entry.id
        invoice.amount_paid = self._money(invoice.amount_paid) + self._money(payment.amount)
        invoice.status = self._resolve_status(self._money(invoice.total_amount), self._money(invoice.amount_paid), invoice.due_date)
        await self.session.commit()
        return await self.get_invoice(invoice.id)

    async def generate_owner_statement(self, data: OwnerStatementRequest, created_by: UUID | None = None) -> Invoice:
        owner = await self.session.get(Owner, data.owner_id)
        if not owner:
            raise HTTPException(status_code=404, detail="Owner not found")
        existing = (
            await self.session.execute(
                self._invoice_query().where(
                    Invoice.owner_id == data.owner_id,
                    Invoice.recipient_type == InvoiceRecipientType.OWNER,
                    Invoice.period_start == data.period_start,
                    Invoice.period_end == data.period_end,
                    Invoice.status != InvoiceStatus.CANCELLED,
                )
            )
        ).scalar_one_or_none()
        if existing:
            return existing

        units = (await self.session.execute(select(Unit).where(Unit.owner_id == data.owner_id))).scalars().all()
        if not units:
            raise HTTPException(status_code=422, detail="Owner has no linked units")
        unit_map = {unit.id: unit for unit in units}
        unit_ids = list(unit_map.keys())

        customer_invoices = (
            await self.session.execute(
                select(Invoice)
                .options(selectinload(Invoice.lines))
                .where(
                    Invoice.recipient_type == InvoiceRecipientType.CUSTOMER,
                    Invoice.status != InvoiceStatus.CANCELLED,
                    Invoice.unit_id.in_(unit_ids),
                    Invoice.period_start <= data.period_end,
                    Invoice.period_end >= data.period_start,
                )
            )
        ).scalars().all()
        gross_revenue = Decimal("0.00")
        management_fee = Decimal("0.00")
        for invoice in customer_invoices:
            eligible = sum(
                self._money(line.total_amount)
                for line in invoice.lines
                if line.line_type in {InvoiceLineType.ACCOMMODATION, InvoiceLineType.SERVICE}
            )
            gross_revenue += eligible
            unit = unit_map.get(invoice.unit_id)
            if unit:
                service_date = invoice.period_end or invoice.issue_date
                management_fee += await self._management_fee_amount(unit, service_date, eligible)

        expense_total = self._money(
            (
                await self.session.execute(
                    select(func.coalesce(func.sum(ExpenseRecord.amount), 0)).where(
                        ExpenseRecord.unit_id.in_(unit_ids),
                        ExpenseRecord.record_date >= data.period_start,
                        ExpenseRecord.record_date <= data.period_end,
                    )
                )
            ).scalar_one()
        )
        net_due = gross_revenue - expense_total - management_fee
        issue_date = data.issue_date or date.today()
        invoice = Invoice(
            invoice_number=await self._next_invoice_number(InvoiceRecipientType.OWNER),
            recipient_type=InvoiceRecipientType.OWNER,
            status=InvoiceStatus.ISSUED,
            owner_id=data.owner_id,
            issue_date=issue_date,
            due_date=data.due_date,
            period_start=data.period_start,
            period_end=data.period_end,
            subtotal=net_due,
            tax_amount=0,
            total_amount=net_due,
            amount_paid=0,
            notes=data.notes,
        )
        invoice.lines = [
            InvoiceLine(line_type=InvoiceLineType.OWNER_REVENUE, description="Gross booking revenue", quantity=1, unit_price=gross_revenue, total_amount=gross_revenue),
            InvoiceLine(line_type=InvoiceLineType.OWNER_EXPENSE, description="Unit expenses", quantity=1, unit_price=-expense_total, total_amount=-expense_total),
            InvoiceLine(line_type=InvoiceLineType.MANAGEMENT_FEE, description="Management fee", quantity=1, unit_price=-management_fee, total_amount=-management_fee),
        ]
        self.session.add(invoice)
        await self.session.flush()
        await self.session.commit()
        return await self.get_invoice(invoice.id)

    async def _management_fee_amount(self, unit: Unit, service_date: date, eligible_amount: Decimal) -> Decimal:
        if not unit.owner_id or not unit.is_managed_by_us or eligible_amount <= 0:
            return Decimal("0.00")
        contract = (
            await self.session.execute(
                select(UnitManagementContract)
                .where(
                    UnitManagementContract.unit_id == unit.id,
                    UnitManagementContract.status == ContractStatus.ACTIVE,
                    UnitManagementContract.starts_on <= service_date,
                    (UnitManagementContract.ends_on.is_(None) | (UnitManagementContract.ends_on >= service_date)),
                )
                .order_by(UnitManagementContract.starts_on.desc())
            )
        ).scalars().first()
        percent = self._money(contract.admin_fee_percent if contract else unit.admin_fee_percent)
        if percent <= 0:
            return Decimal("0.00")
        return (eligible_amount * percent / Decimal("100")).quantize(MONEY, rounding=ROUND_HALF_UP)

    async def _post_customer_invoice(
        self,
        invoice: Invoice,
        booking: Booking,
        unit: Unit,
        accommodation: Decimal,
        tax: Decimal,
        deposit: Decimal,
        admin_fee: Decimal,
        created_by: UUID | None,
    ):
        total = self._money(invoice.total_amount)
        lines: list[dict[str, Any]] = [
            {
                "account_code": "1100",
                "debit": total,
                "unit_id": unit.id,
                "owner_id": unit.owner_id,
                "management_entity_id": unit.management_entity_id,
                "booking_id": booking.id,
                "invoice_id": invoice.id,
                "description": "Customer invoice receivable",
            }
        ]
        if unit.owner_id and unit.is_managed_by_us:
            lines.append(
                {
                    "account_code": "2100",
                    "credit": accommodation,
                    "unit_id": unit.id,
                    "owner_id": unit.owner_id,
                    "management_entity_id": unit.management_entity_id,
                    "booking_id": booking.id,
                    "invoice_id": invoice.id,
                    "description": "Owner gross revenue payable",
                }
            )
            if admin_fee > 0:
                lines.extend(
                    [
                        {
                            "account_code": "2100",
                            "debit": admin_fee,
                            "unit_id": unit.id,
                            "owner_id": unit.owner_id,
                            "management_entity_id": unit.management_entity_id,
                            "booking_id": booking.id,
                            "invoice_id": invoice.id,
                            "description": "Management fee deduction from owner payable",
                        },
                        {
                            "account_code": "4200",
                            "credit": admin_fee,
                            "unit_id": unit.id,
                            "owner_id": unit.owner_id,
                            "management_entity_id": unit.management_entity_id,
                            "booking_id": booking.id,
                            "invoice_id": invoice.id,
                            "description": "Management fee revenue",
                        },
                    ]
                )
        else:
            lines.append(
                {
                    "account_code": "4000",
                    "credit": accommodation,
                    "unit_id": unit.id,
                    "booking_id": booking.id,
                    "invoice_id": invoice.id,
                    "description": "Accommodation revenue",
                }
            )
        if tax > 0:
            lines.append(
                {
                    "account_code": "2200",
                    "credit": tax,
                    "unit_id": unit.id,
                    "owner_id": unit.owner_id,
                    "management_entity_id": unit.management_entity_id,
                    "booking_id": booking.id,
                    "invoice_id": invoice.id,
                    "description": "Tax payable",
                }
            )
        if deposit > 0:
            lines.append(
                {
                    "account_code": "2300",
                    "credit": deposit,
                    "unit_id": unit.id,
                    "owner_id": unit.owner_id,
                    "management_entity_id": unit.management_entity_id,
                    "booking_id": booking.id,
                    "invoice_id": invoice.id,
                    "description": "Customer deposit liability",
                }
            )
        return await self.accounting.create_entry_from_account_codes(
            entry_date=invoice.issue_date,
            description=f"Invoice {invoice.invoice_number}",
            source=JournalSource.INVOICE,
            source_id=invoice.id,
            lines=lines,
            created_by=created_by,
        )

    async def _post_invoice_payment(
        self,
        invoice: Invoice,
        payment: InvoicePayment,
        booking: Booking | None,
        unit: Unit,
        created_by: UUID | None,
    ):
        return await self.accounting.create_entry_from_account_codes(
            entry_date=payment.payment_date,
            description=f"Payment for invoice {invoice.invoice_number}",
            source=JournalSource.PAYMENT,
            source_id=payment.id,
            lines=[
                {
                    "account_code": "1000",
                    "debit": payment.amount,
                    "unit_id": unit.id,
                    "owner_id": invoice.owner_id,
                    "management_entity_id": unit.management_entity_id,
                    "booking_id": booking.id if booking else None,
                    "invoice_id": invoice.id,
                    "description": "Cash received",
                },
                {
                    "account_code": "1100",
                    "credit": payment.amount,
                    "unit_id": unit.id,
                    "owner_id": invoice.owner_id,
                    "management_entity_id": unit.management_entity_id,
                    "booking_id": booking.id if booking else None,
                    "invoice_id": invoice.id,
                    "description": "Receivable settled",
                },
            ],
            created_by=created_by,
        )

    async def _create_booking_revenue_record(
        self,
        booking: Booking,
        amount: Decimal,
        journal_entry_id: UUID,
        created_by: UUID | None,
    ) -> None:
        if amount <= 0:
            return
        existing = (
            await self.session.execute(
                select(RevenueRecord.id).where(
                    RevenueRecord.booking_id == booking.id,
                    RevenueRecord.category == FinanceCategory.RENT,
                )
            )
        ).scalar_one_or_none()
        if existing:
            return
        self.session.add(
            RevenueRecord(
                unit_id=booking.unit_id,
                booking_id=booking.id,
                created_by=created_by,
                amount=amount,
                category=FinanceCategory.RENT,
                description="Generated from checkout invoice",
                record_date=booking.check_out,
                journal_entry_id=journal_entry_id,
            )
        )

    def _resolve_status(self, total: Decimal, amount_paid: Decimal, due_date: date | None) -> InvoiceStatus:
        if amount_paid >= total and total > 0:
            return InvoiceStatus.PAID
        if amount_paid > 0:
            return InvoiceStatus.PARTIALLY_PAID
        if due_date and due_date < date.today():
            return InvoiceStatus.OVERDUE
        return InvoiceStatus.ISSUED