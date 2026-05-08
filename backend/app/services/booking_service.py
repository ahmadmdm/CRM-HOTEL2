from typing import Optional
from uuid import UUID
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.booking_repository import BookingRepository
from app.repositories.unit_repository import UnitRepository
from app.repositories.customer_repository import CustomerRepository
from app.domain.models.booking import Booking, BookingStatus, PaymentStatus
from app.domain.models.unit import UnitStatus
from app.domain.models.operation import CleaningTask
from app.domain.schemas.booking import (
    BookingCreate, BookingUpdate, BookingCheckIn, BookingCheckOut, BookingPaymentUpdate
)
from app.services.invoice_service import InvoiceService


class BookingService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = BookingRepository(session)
        self.unit_repo = UnitRepository(session)
        self.customer_repo = CustomerRepository(session)

    async def create_booking(self, data: BookingCreate, created_by: UUID) -> Booking:
        # Validate unit exists
        unit = await self.unit_repo.get_by_id(data.unit_id)
        if not unit:
            raise HTTPException(status_code=404, detail="Unit not found")

        if unit.status not in [UnitStatus.VACANT, UnitStatus.READY]:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Unit is not available. Current status: {unit.status.value}",
            )

        # Validate customer
        customer = await self.customer_repo.get_by_id(data.customer_id)
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        if customer.is_blacklisted:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Customer is blacklisted: {customer.blacklist_reason}",
            )

        # Check availability
        available = await self.repo.check_unit_availability(
            data.unit_id, data.check_in, data.check_out
        )
        if not available:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Unit is not available for the selected dates",
            )

        # Create booking
        booking = Booking(
            **data.model_dump(),
            created_by=created_by,
            status=BookingStatus.CONFIRMED,
        )
        created = await self.repo.create(booking)

        # Update unit status → RESERVED
        unit.status = UnitStatus.RESERVED
        await self.repo.commit()
        return await self._get_booking(created.id)

    async def check_in(self, booking_id: UUID, data: BookingCheckIn) -> Booking:
        booking = await self._get_booking(booking_id)
        if booking.status != BookingStatus.CONFIRMED:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Only confirmed bookings can be checked in",
            )
        booking.status = BookingStatus.CHECKED_IN
        booking.actual_check_in = data.actual_check_in or datetime.now(timezone.utc)
        if data.notes:
            booking.notes = (booking.notes or "") + f"\n[Check-in] {data.notes}"

        # Unit → OCCUPIED
        unit = await self.unit_repo.get_by_id(booking.unit_id)
        unit.status = UnitStatus.OCCUPIED
        await self.repo.commit()
        return await self._get_booking(booking.id)

    async def check_out(self, booking_id: UUID, data: BookingCheckOut) -> Booking:
        booking = await self._get_booking(booking_id)
        if booking.status != BookingStatus.CHECKED_IN:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Only checked-in bookings can be checked out",
            )
        booking.status = BookingStatus.CHECKED_OUT
        booking.actual_check_out = data.actual_check_out or datetime.now(timezone.utc)
        if data.notes:
            booking.notes = (booking.notes or "") + f"\n[Check-out] {data.notes}"

        # Unit → WAITING_CLEANING and auto-create cleaning task
        unit = await self.unit_repo.get_by_id(booking.unit_id)
        unit.status = UnitStatus.WAITING_CLEANING
        cleaning_task = CleaningTask(unit_id=booking.unit_id, booking_id=booking.id)
        self.session.add(cleaning_task)
        await InvoiceService(self.session).generate_customer_invoice_from_booking(
            booking.id,
            commit=False,
        )

        await self.repo.commit()
        return await self._get_booking(booking.id)

    async def cancel_booking(self, booking_id: UUID) -> Booking:
        booking = await self._get_booking(booking_id)
        if booking.status in [BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Cannot cancel a booking that is already checked in or out",
            )
        booking.status = BookingStatus.CANCELLED
        unit = await self.unit_repo.get_by_id(booking.unit_id)
        if unit.status == UnitStatus.RESERVED:
            unit.status = UnitStatus.VACANT
        await self.repo.commit()
        return await self._get_booking(booking.id)

    async def update_payment(
        self, booking_id: UUID, data: BookingPaymentUpdate
    ) -> Booking:
        booking = await self._get_booking(booking_id)
        booking.amount_paid = data.amount_paid
        booking.payment_status = data.payment_status
        await self.repo.commit()
        return await self._get_booking(booking.id)

    async def update_booking(self, booking_id: UUID, data: BookingUpdate) -> Booking:
        booking = await self._get_booking(booking_id)
        if booking.status not in [BookingStatus.PENDING, BookingStatus.CONFIRMED]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Can only update pending or confirmed bookings",
            )
        for key, value in data.model_dump(exclude_none=True).items():
            setattr(booking, key, value)
        await self.repo.commit()
        return await self._get_booking(booking.id)

    async def list_bookings(self, skip: int = 0, limit: int = 20, filters=None):
        return await self.repo.get_all(skip=skip, limit=limit, filters=filters)

    async def _get_booking(self, booking_id: UUID) -> Booking:
        booking = await self.repo.get_by_id(booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        return booking
