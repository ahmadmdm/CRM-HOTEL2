from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Query, Depends
from app.domain.schemas.booking import (
    BookingCreate, BookingUpdate, BookingResponse, BookingDetailResponse,
    BookingCheckIn, BookingCheckOut, BookingPaymentUpdate
)
from app.domain.schemas.common import PaginatedResponse
from app.domain.models.booking import BookingStatus, PaymentStatus
from app.services.booking_service import BookingService
from app.core.dependencies import (
    DBSession, CurrentUserPayload, AdminOrFinancial, AdminOrSubAdmin, AdminOrOperations
)

router = APIRouter(prefix="/bookings", tags=["Bookings"])


@router.post("", response_model=BookingResponse, dependencies=[AdminOrOperations])
async def create_booking(
    data: BookingCreate, db: DBSession, payload: CurrentUserPayload
):
    from uuid import UUID as PUUID
    service = BookingService(db)
    return await service.create_booking(data, PUUID(payload["sub"]))


@router.get("", response_model=PaginatedResponse[BookingResponse], dependencies=[AdminOrOperations])
async def list_bookings(
    db: DBSession,
    _: CurrentUserPayload,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[BookingStatus] = Query(None),
    unit_id: Optional[UUID] = Query(None),
    customer_id: Optional[UUID] = Query(None),
):
    from app.domain.models.booking import Booking
    service = BookingService(db)
    filters = []
    if status:
        filters.append(Booking.status == status)
    if unit_id:
        filters.append(Booking.unit_id == unit_id)
    if customer_id:
        filters.append(Booking.customer_id == customer_id)
    items, total = await service.list_bookings(
        skip=(page - 1) * page_size, limit=page_size, filters=filters
    )
    return PaginatedResponse.create(
        items=[BookingResponse.model_validate(b) for b in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{booking_id}", response_model=BookingResponse, dependencies=[AdminOrOperations])
async def get_booking(booking_id: UUID, db: DBSession, _: CurrentUserPayload):
    service = BookingService(db)
    return await service._get_booking(booking_id)


@router.patch("/{booking_id}", response_model=BookingResponse, dependencies=[AdminOrOperations])
async def update_booking(booking_id: UUID, data: BookingUpdate, db: DBSession):
    service = BookingService(db)
    return await service.update_booking(booking_id, data)


@router.post("/{booking_id}/check-in", response_model=BookingResponse, dependencies=[AdminOrOperations])
async def check_in(booking_id: UUID, data: BookingCheckIn, db: DBSession):
    service = BookingService(db)
    return await service.check_in(booking_id, data)


@router.post("/{booking_id}/check-out", response_model=BookingResponse, dependencies=[AdminOrOperations])
async def check_out(booking_id: UUID, data: BookingCheckOut, db: DBSession):
    service = BookingService(db)
    return await service.check_out(booking_id, data)


@router.post("/{booking_id}/cancel", response_model=BookingResponse, dependencies=[AdminOrOperations])
async def cancel_booking(booking_id: UUID, db: DBSession):
    service = BookingService(db)
    return await service.cancel_booking(booking_id)


@router.patch("/{booking_id}/payment", response_model=BookingResponse, dependencies=[AdminOrFinancial])
async def update_payment(
    booking_id: UUID, data: BookingPaymentUpdate, db: DBSession, _: CurrentUserPayload
):
    service = BookingService(db)
    return await service.update_payment(booking_id, data)
