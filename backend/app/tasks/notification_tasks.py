import logging
from datetime import date, timedelta

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.session import AsyncSessionLocal
from app.domain.models.booking import Booking, BookingStatus
from app.tasks.celery_app import celery_app
from app.tasks.runtime import run_async_task

logger = logging.getLogger(__name__)


async def _send_checkin_reminders(
    session_factory: async_sessionmaker[AsyncSession] = AsyncSessionLocal,
) -> dict[str, int]:
    tomorrow = date.today() + timedelta(days=1)

    async with session_factory() as session:
        bookings = (
            await session.execute(
                select(Booking).where(
                    and_(
                        Booking.check_in == tomorrow,
                        Booking.status == BookingStatus.CONFIRMED,
                    )
                )
            )
        ).scalars().all()

    for booking in bookings:
        logger.info(
            "booking.checkin_reminder",
            extra={"booking_id": str(booking.id), "customer_id": str(booking.customer_id)},
        )

    return {"reminders_sent": len(bookings)}


@celery_app.task(bind=True, max_retries=3)
def send_checkin_reminders(self):
    """
    Sends reminder notifications for bookings checking in tomorrow.
    Runs every 12 hours via Celery Beat.
    Extend this to send SMS/Email via your preferred provider.
    """
    return run_async_task(self, "send_checkin_reminders", _send_checkin_reminders)


@celery_app.task
def send_notification(user_id: str, title: str, message: str, notification_type: str = "info"):
    """
    Generic notification task.
    Extend to push via WebSocket, FCM (mobile), or email.
    """
    logger.info(
        "NOTIFICATION [%s] → user=%s | %s: %s",
        notification_type,
        user_id,
        title,
        message,
    )
    return {"sent": True}
