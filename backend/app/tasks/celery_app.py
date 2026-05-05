from celery import Celery
from app.core.config import settings
from app.core.logging import configure_logging

configure_logging()

celery_app = Celery(
    "crm_tasks",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.booking_tasks",
        "app.tasks.notification_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Riyadh",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
    # Scheduled tasks (Beat)
    beat_schedule={
        "auto-checkout-expired-bookings": {
            "task": "app.tasks.booking_tasks.auto_checkout_expired_bookings",
            "schedule": 3600.0,  # every hour
        },
        "send-checkin-reminders": {
            "task": "app.tasks.notification_tasks.send_checkin_reminders",
            "schedule": 3600.0 * 12,  # every 12 hours
        },
    },
)
