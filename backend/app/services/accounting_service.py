from datetime import date, datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domain.models.accounting import (
    Account,
    AccountType,
    JournalEntry,
    JournalLine,
    JournalSource,
    JournalStatus,
)
from app.domain.models.finance import ExpenseRecord, FinanceCategory, RevenueRecord
from app.domain.schemas.accounting import AccountCreate, JournalEntryCreate, TrialBalanceItem, TrialBalanceResponse


MONEY = Decimal("0.01")


DEFAULT_ACCOUNTS: list[tuple[str, str, AccountType]] = [
    ("1000", "Cash and bank", AccountType.ASSET),
    ("1100", "Accounts receivable", AccountType.ASSET),
    ("2000", "Accounts payable", AccountType.LIABILITY),
    ("2100", "Owner payable", AccountType.LIABILITY),
    ("2200", "Tax payable", AccountType.LIABILITY),
    ("2300", "Customer deposits", AccountType.LIABILITY),
    ("3000", "Owner equity", AccountType.EQUITY),
    ("4000", "Accommodation revenue", AccountType.REVENUE),
    ("4100", "Service and fee revenue", AccountType.REVENUE),
    ("4200", "Management fee revenue", AccountType.REVENUE),
    ("4300", "Other income", AccountType.REVENUE),
    ("5000", "Maintenance expense", AccountType.EXPENSE),
    ("5100", "Cleaning expense", AccountType.EXPENSE),
    ("5200", "Utilities expense", AccountType.EXPENSE),
    ("5300", "Supplies expense", AccountType.EXPENSE),
    ("5400", "Salary expense", AccountType.EXPENSE),
    ("5500", "Tax expense", AccountType.EXPENSE),
    ("5900", "Other expense", AccountType.EXPENSE),
]


REVENUE_ACCOUNT_BY_CATEGORY = {
    FinanceCategory.RENT: "4000",
    FinanceCategory.DEPOSIT: "2300",
    FinanceCategory.LATE_FEE: "4100",
    FinanceCategory.SERVICE_FEE: "4100",
    FinanceCategory.OTHER_INCOME: "4300",
}


EXPENSE_ACCOUNT_BY_CATEGORY = {
    FinanceCategory.MAINTENANCE_COST: "5000",
    FinanceCategory.CLEANING_COST: "5100",
    FinanceCategory.UTILITIES: "5200",
    FinanceCategory.SUPPLIES: "5300",
    FinanceCategory.SALARY: "5400",
    FinanceCategory.TAX: "5500",
    FinanceCategory.OTHER_EXPENSE: "5900",
}


class AccountingService:
    def __init__(self, session: AsyncSession):
        self.session = session

    def _money(self, value: Any) -> Decimal:
        return Decimal(str(value or 0)).quantize(MONEY, rounding=ROUND_HALF_UP)

    async def ensure_default_accounts(self) -> None:
        result = await self.session.execute(select(Account.code).where(Account.code.in_([item[0] for item in DEFAULT_ACCOUNTS])))
        existing_codes = set(result.scalars().all())
        for code, name, account_type in DEFAULT_ACCOUNTS:
            if code not in existing_codes:
                self.session.add(Account(code=code, name=name, account_type=account_type))
        await self.session.flush()

    async def create_account(self, data: AccountCreate) -> Account:
        await self.ensure_default_accounts()
        existing = (await self.session.execute(select(Account).where(Account.code == data.code))).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Account code already exists")
        if data.parent_id:
            parent = await self.session.get(Account, data.parent_id)
            if not parent:
                raise HTTPException(status_code=422, detail="Parent account not found")
        account = Account(**data.model_dump())
        self.session.add(account)
        await self.session.commit()
        await self.session.refresh(account)
        return account

    async def list_accounts(self, active_only: bool = False) -> list[Account]:
        await self.ensure_default_accounts()
        query = select(Account).order_by(Account.code.asc())
        if active_only:
            query = query.where(Account.is_active.is_(True))
        result = await self.session.execute(query)
        return result.scalars().all()

    async def _account_by_code(self, code: str) -> Account:
        await self.ensure_default_accounts()
        account = (await self.session.execute(select(Account).where(Account.code == code))).scalar_one_or_none()
        if not account:
            raise HTTPException(status_code=500, detail=f"Required account {code} is not configured")
        return account

    async def _next_entry_number(self) -> str:
        bind = self.session.get_bind()
        if bind and bind.dialect.name == "postgresql":
            await self.session.execute(select(func.pg_advisory_xact_lock(42101001)))
        total = (await self.session.execute(select(func.count()).select_from(JournalEntry))).scalar_one()
        candidate = total + 1
        while True:
            entry_number = f"JE-{candidate:06d}"
            exists = (await self.session.execute(select(JournalEntry.id).where(JournalEntry.entry_number == entry_number))).scalar_one_or_none()
            if not exists:
                return entry_number
            candidate += 1

    def _validate_balanced(self, lines: list[dict[str, Any]]) -> None:
        if len(lines) < 2:
            raise HTTPException(status_code=422, detail="A journal entry needs at least two lines")
        total_debit = sum(self._money(line.get("debit")) for line in lines)
        total_credit = sum(self._money(line.get("credit")) for line in lines)
        if total_debit != total_credit:
            raise HTTPException(status_code=422, detail="Journal entry is not balanced")
        for line in lines:
            debit = self._money(line.get("debit"))
            credit = self._money(line.get("credit"))
            if debit < 0 or credit < 0:
                raise HTTPException(status_code=422, detail="Debit and credit cannot be negative")
            if (debit == 0 and credit == 0) or (debit > 0 and credit > 0):
                raise HTTPException(status_code=422, detail="Each line must have either debit or credit")

    async def create_journal_entry(self, data: JournalEntryCreate, created_by: UUID | None = None) -> JournalEntry:
        lines = [line.model_dump() for line in data.lines]
        entry = await self.create_entry(
            entry_date=data.entry_date,
            description=data.description,
            source=data.source,
            source_id=data.source_id,
            lines=lines,
            created_by=created_by,
            status_value=data.status,
            commit=True,
        )
        return entry

    async def create_entry_from_account_codes(
        self,
        *,
        entry_date: date,
        description: str,
        source: JournalSource,
        source_id: UUID | None,
        lines: list[dict[str, Any]],
        created_by: UUID | None = None,
        status_value: JournalStatus = JournalStatus.POSTED,
        commit: bool = False,
    ) -> JournalEntry:
        resolved_lines = []
        for line in lines:
            account = await self._account_by_code(line["account_code"])
            payload = {key: value for key, value in line.items() if key != "account_code"}
            payload["account_id"] = account.id
            resolved_lines.append(payload)
        return await self.create_entry(
            entry_date=entry_date,
            description=description,
            source=source,
            source_id=source_id,
            lines=resolved_lines,
            created_by=created_by,
            status_value=status_value,
            commit=commit,
        )

    async def create_entry(
        self,
        *,
        entry_date: date,
        description: str,
        source: JournalSource,
        source_id: UUID | None,
        lines: list[dict[str, Any]],
        created_by: UUID | None = None,
        status_value: JournalStatus = JournalStatus.POSTED,
        commit: bool = False,
    ) -> JournalEntry:
        self._validate_balanced(lines)
        entry = JournalEntry(
            entry_number=await self._next_entry_number(),
            entry_date=entry_date,
            description=description,
            source=source,
            source_id=source_id,
            status=status_value,
            created_by=created_by,
            posted_at=datetime.now(timezone.utc) if status_value == JournalStatus.POSTED else None,
        )
        entry.lines = [
            JournalLine(
                account_id=line["account_id"],
                description=line.get("description"),
                debit=self._money(line.get("debit")),
                credit=self._money(line.get("credit")),
                unit_id=line.get("unit_id"),
                owner_id=line.get("owner_id"),
                management_entity_id=line.get("management_entity_id"),
                booking_id=line.get("booking_id"),
                invoice_id=line.get("invoice_id"),
            )
            for line in lines
        ]
        self.session.add(entry)
        await self.session.flush()
        if commit:
            await self.session.commit()
            return await self.get_journal_entry(entry.id)
        return entry

    async def create_revenue_entry(self, record: RevenueRecord) -> JournalEntry | None:
        if record.journal_entry_id:
            return None
        account_code = REVENUE_ACCOUNT_BY_CATEGORY.get(record.category)
        if not account_code:
            raise HTTPException(status_code=422, detail="Revenue category is not mapped to a revenue account")
        entry = await self.create_entry_from_account_codes(
            entry_date=record.record_date,
            description=record.description or f"Revenue {record.category.value}",
            source=JournalSource.REVENUE,
            source_id=record.id,
            lines=[
                {
                    "account_code": "1000",
                    "debit": record.amount,
                    "unit_id": record.unit_id,
                    "booking_id": record.booking_id,
                    "description": "Cash received",
                },
                {
                    "account_code": account_code,
                    "credit": record.amount,
                    "unit_id": record.unit_id,
                    "booking_id": record.booking_id,
                    "description": record.category.value,
                },
            ],
        )
        record.journal_entry_id = entry.id
        await self.session.flush()
        return entry

    async def create_expense_entry(self, record: ExpenseRecord) -> JournalEntry | None:
        if record.journal_entry_id:
            return None
        account_code = EXPENSE_ACCOUNT_BY_CATEGORY.get(record.category)
        if not account_code:
            raise HTTPException(status_code=422, detail="Expense category is not mapped to an expense account")
        entry = await self.create_entry_from_account_codes(
            entry_date=record.record_date,
            description=record.description or f"Expense {record.category.value}",
            source=JournalSource.EXPENSE,
            source_id=record.id,
            lines=[
                {
                    "account_code": account_code,
                    "debit": record.amount,
                    "unit_id": record.unit_id,
                    "description": record.category.value,
                },
                {
                    "account_code": "1000",
                    "credit": record.amount,
                    "unit_id": record.unit_id,
                    "description": "Cash paid",
                },
            ],
        )
        record.journal_entry_id = entry.id
        await self.session.flush()
        return entry

    async def get_journal_entry(self, entry_id: UUID) -> JournalEntry:
        result = await self.session.execute(
            select(JournalEntry)
            .options(selectinload(JournalEntry.lines).selectinload(JournalLine.account))
            .where(JournalEntry.id == entry_id)
        )
        entry = result.scalar_one_or_none()
        if not entry:
            raise HTTPException(status_code=404, detail="Journal entry not found")
        return entry

    async def list_journal_entries(self, skip: int = 0, limit: int = 20, source: JournalSource | None = None):
        query = select(JournalEntry).options(selectinload(JournalEntry.lines).selectinload(JournalLine.account))
        count_query = select(func.count()).select_from(JournalEntry)
        if source:
            query = query.where(JournalEntry.source == source)
            count_query = count_query.where(JournalEntry.source == source)
        total = (await self.session.execute(count_query)).scalar_one()
        result = await self.session.execute(query.order_by(JournalEntry.entry_date.desc(), JournalEntry.created_at.desc()).offset(skip).limit(limit))
        return result.scalars().all(), total

    async def trial_balance(self, start_date: date, end_date: date) -> TrialBalanceResponse:
        await self.ensure_default_accounts()
        accounts = (await self.session.execute(select(Account).order_by(Account.code.asc()))).scalars().all()
        totals_result = await self.session.execute(
            select(
                JournalLine.account_id,
                func.coalesce(func.sum(JournalLine.debit), 0),
                func.coalesce(func.sum(JournalLine.credit), 0),
            )
            .join(JournalEntry, JournalEntry.id == JournalLine.entry_id)
            .where(
                JournalEntry.status == JournalStatus.POSTED,
                JournalEntry.entry_date >= start_date,
                JournalEntry.entry_date <= end_date,
            )
            .group_by(JournalLine.account_id)
        )
        totals = {
            row[0]: {"debit": self._money(row[1]), "credit": self._money(row[2])}
            for row in totals_result.all()
        }
        items: list[TrialBalanceItem] = []
        total_debit = Decimal("0.00")
        total_credit = Decimal("0.00")
        for account in accounts:
            account_totals = totals.get(account.id, {"debit": Decimal("0.00"), "credit": Decimal("0.00")})
            debit = account_totals["debit"]
            credit = account_totals["credit"]
            total_debit += debit
            total_credit += credit
            balance = debit - credit if account.account_type in {AccountType.ASSET, AccountType.EXPENSE} else credit - debit
            items.append(
                TrialBalanceItem(
                    account_id=account.id,
                    code=account.code,
                    name=account.name,
                    account_type=account.account_type,
                    debit=float(debit),
                    credit=float(credit),
                    balance=float(balance),
                )
            )
        return TrialBalanceResponse(
            period_start=start_date,
            period_end=end_date,
            total_debit=float(total_debit),
            total_credit=float(total_credit),
            is_balanced=total_debit == total_credit,
            items=items,
        )