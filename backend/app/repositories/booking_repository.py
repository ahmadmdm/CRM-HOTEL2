from typing import Optional, List
from uuid import UUID
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from app.repositories.base import BaseRepository
from app.domain.models.booking import Booking, BookingStatus


class BookingRepository(BaseRepository[Booking]):
    def __init__(self, session: AsyncSession):
        super().__init__(Booking, session)

    async def get_by_id(self, id: UUID) -> Optional[Booking]:
        result = await self.session.execute(
            select(Booking)
            .options(selectinload(Booking.unit), selectinload(Booking.customer))
            .where(Booking.id == id)
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 20,
        filters: List = None,
    ) -> tuple[List[Booking], int]:
        from sqlalchemy import func

        query = select(Booking).options(
            selectinload(Booking.unit),
            selectinload(Booking.customer),
        )
        count_query = select(func.count()).select_from(Booking)
        if filters:
            for condition in filters:
                query = query.where(condition)
                count_query = count_query.where(condition)

        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()
        result = await self.session.execute(
            query.offset(skip).limit(limit).order_by(Booking.created_at.desc())
        )
        return result.scalars().all(), total

    async def get_active_booking_for_unit(self, unit_id: UUID) -> Optional[Booking]:
        result = await self.session.execute(
            select(Booking).where(
                and_(
                    Booking.unit_id == unit_id,
                    Booking.status.in_(
                        [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN]
                    ),
                )
            )
        )
        return result.scalar_one_or_none()

    async def check_unit_availability(
        self, unit_id: UUID, check_in: date, check_out: date, exclude_id: UUID = None
    ) -> bool:
        """Returns True if unit is available for the given date range."""
        query = select(Booking).where(
            and_(
                Booking.unit_id == unit_id,
                Booking.status.not_in(
                    [BookingStatus.CANCELLED, BookingStatus.NO_SHOW]
                ),
                or_(
                    and_(Booking.check_in <= check_in, Booking.check_out > check_in),
                    and_(Booking.check_in < check_out, Booking.check_out >= check_out),
                    and_(Booking.check_in >= check_in, Booking.check_out <= check_out),
                ),
            )
        )
        if exclude_id:
            query = query.where(Booking.id != exclude_id)
        result = await self.session.execute(query)
        conflicting = result.scalars().first()
        return conflicting is None

    async def get_bookings_by_customer(self, customer_id: UUID) -> List[Booking]:
        result = await self.session.execute(
            select(Booking)
            .where(Booking.customer_id == customer_id)
            .order_by(Booking.check_in.desc())
        )
        return result.scalars().all()

    async def get_upcoming_checkouts(self, target_date: date) -> List[Booking]:
        result = await self.session.execute(
            select(Booking).where(
                and_(
                    Booking.check_out == target_date,
                    Booking.status == BookingStatus.CHECKED_IN,
                )
            )
        )
        return result.scalars().all()
