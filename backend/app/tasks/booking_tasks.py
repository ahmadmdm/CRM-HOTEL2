import logging
import uuid
from datetime import date, datetime, timezone
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.session import AsyncSessionLocal
from app.domain.models.booking import Booking, BookingStatus
from app.domain.models.operation import CleaningTask
from app.domain.models.unit import Unit, UnitStatus
from app.tasks.celery_app import celery_app
from app.tasks.runtime import run_async_task

logger = logging.getLogger(__name__)


async def _auto_checkout_expired_bookings(
    session_factory: async_sessionmaker[AsyncSession] = AsyncSessionLocal,
) -> dict[str, int]:
    today = date.today()
    processed = 0

    async with session_factory() as session:
        try:
            expired = (
                await session.execute(
                    select(Booking).where(
                        and_(
                            Booking.status == BookingStatus.CHECKED_IN,
                            Booking.check_out < today,
                        )
                    )
                )
            ).scalars().all()

            for booking in expired:
                booking.status = BookingStatus.CHECKED_OUT
                booking.actual_check_out = datetime.now(timezone.utc)

                unit = await session.get(Unit, booking.unit_id)
                if unit:
                    unit.status = UnitStatus.WAITING_CLEANING
                    session.add(CleaningTask(unit_id=booking.unit_id, booking_id=booking.id))

                processed += 1
                logger.info(
                    "booking.auto_checked_out",
                    extra={"booking_id": str(booking.id), "unit_id": str(booking.unit_id)},
                )

            await session.commit()
            return {"processed": processed}
        except Exception:
            await session.rollback()
            raise


async def _trigger_booking_checkout(
    booking_id: str,
    session_factory: async_sessionmaker[AsyncSession] = AsyncSessionLocal,
) -> dict[str, int | str]:
    booking_uuid = uuid.UUID(booking_id)

    async with session_factory() as session:
        try:
            booking = await session.get(Booking, booking_uuid)
            if not booking:
                logger.warning("booking.checkout_missing", extra={"booking_id": booking_id})
                return {"processed": 0, "booking_id": booking_id, "reason": "not_found"}

            if booking.status != BookingStatus.CHECKED_IN:
                logger.info(
                    "booking.checkout_skipped",
                    extra={
                        "booking_id": booking_id,
                        "current_status": booking.status.value,
                    },
                )
                return {"processed": 0, "booking_id": booking_id, "reason": "status_not_checked_in"}

            booking.status = BookingStatus.CHECKED_OUT
            booking.actual_check_out = datetime.now(timezone.utc)

            unit = await session.get(Unit, booking.unit_id)
            if unit:
                unit.status = UnitStatus.WAITING_CLEANING
                session.add(CleaningTask(unit_id=unit.id, booking_id=booking.id))

            await session.commit()
            logger.info("booking.checkout_triggered", extra={"booking_id": booking_id})
            return {"processed": 1, "booking_id": booking_id}
        except Exception:
            await session.rollback()
            raise


@celery_app.task(bind=True, max_retries=3, default_retry_delay=300)
def auto_checkout_expired_bookings(self):
    """
    Automatically checks out bookings whose checkout date has passed
    but are still in CHECKED_IN status. Runs every hour via Celery Beat.
    """
    return run_async_task(self, "auto_checkout_expired_bookings", _auto_checkout_expired_bookings)


@celery_app.task(bind=True, max_retries=3)
def trigger_booking_checkout(self, booking_id: str):
    """Manually trigger checkout for a specific booking."""
    return run_async_task(
        self,
        "trigger_booking_checkout",
        lambda: _trigger_booking_checkout(booking_id),
    )
