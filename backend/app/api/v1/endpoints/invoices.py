from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Query

from app.core.dependencies import AdminOrFinancial, CurrentUserPayload, DBSession
from app.domain.models.invoice import InvoiceRecipientType, InvoiceStatus
from app.domain.schemas.common import PaginatedResponse
from app.domain.schemas.invoice import (
    GenerateBookingInvoiceRequest,
    InvoicePaymentCreate,
    InvoiceResponse,
    OwnerStatementRequest,
)
from app.services.invoice_service import InvoiceService

router = APIRouter(prefix="/invoices", tags=["Invoices"])


@router.get("", response_model=PaginatedResponse[InvoiceResponse], dependencies=[AdminOrFinancial])
async def list_invoices(
    db: DBSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    recipient_type: Optional[InvoiceRecipientType] = Query(None),
    status: Optional[InvoiceStatus] = Query(None),
    unit_id: Optional[UUID] = Query(None),
    customer_id: Optional[UUID] = Query(None),
    owner_id: Optional[UUID] = Query(None),
):
    service = InvoiceService(db)
    items, total = await service.list_invoices(
        skip=(page - 1) * page_size,
        limit=page_size,
        recipient_type=recipient_type,
        status=status,
        unit_id=unit_id,
        customer_id=customer_id,
        owner_id=owner_id,
    )
    return PaginatedResponse.create(
        items=[InvoiceResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{invoice_id}", response_model=InvoiceResponse, dependencies=[AdminOrFinancial])
async def get_invoice(invoice_id: UUID, db: DBSession):
    service = InvoiceService(db)
    return await service.get_invoice(invoice_id)


@router.post("/from-booking/{booking_id}", response_model=InvoiceResponse, dependencies=[AdminOrFinancial])
async def generate_booking_invoice(
    booking_id: UUID,
    data: GenerateBookingInvoiceRequest,
    db: DBSession,
    payload: CurrentUserPayload,
):
    from uuid import UUID as PUUID

    service = InvoiceService(db)
    return await service.generate_customer_invoice_from_booking(booking_id, data, PUUID(payload["sub"]))


@router.post("/{invoice_id}/payments", response_model=InvoiceResponse, dependencies=[AdminOrFinancial])
async def add_invoice_payment(
    invoice_id: UUID,
    data: InvoicePaymentCreate,
    db: DBSession,
    payload: CurrentUserPayload,
):
    from uuid import UUID as PUUID

    service = InvoiceService(db)
    return await service.add_payment(invoice_id, data, PUUID(payload["sub"]))


@router.post("/owner-statements", response_model=InvoiceResponse, dependencies=[AdminOrFinancial])
async def generate_owner_statement(data: OwnerStatementRequest, db: DBSession, payload: CurrentUserPayload):
    from uuid import UUID as PUUID

    service = InvoiceService(db)
    return await service.generate_owner_statement(data, PUUID(payload["sub"]))