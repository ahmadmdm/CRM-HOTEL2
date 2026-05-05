from datetime import date, timedelta
import uuid

import pytest
from httpx import AsyncClient
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.domain.models.booking import Booking, BookingStatus
from app.domain.models.customer import Customer
from app.domain.models.operation import CleaningTask
from app.domain.models.unit import Unit, UnitStatus
from app.tasks.booking_tasks import _auto_checkout_expired_bookings, _trigger_booking_checkout
from app.tasks.notification_tasks import _send_checkin_reminders
from tests.conftest import TestSessionLocal


def test_settings_reject_unsafe_production_defaults():
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            _env_file=None,
            ENVIRONMENT="production",
            DATABASE_URL="postgresql+asyncpg://app:strongpass@db:5432/crm_db",
            DATABASE_SYNC_URL="postgresql://app:strongpass@db:5432/crm_db",
            SECRET_KEY="short-secret",
            COOKIE_SECURE=False,
            ALLOWED_ORIGINS=["https://crm.example.com"],
        )

    error_message = str(exc_info.value)
    assert "SECRET_KEY" in error_message
    assert "COOKIE_SECURE" in error_message


@pytest.mark.asyncio
async def test_health_echoes_request_id_header(client: AsyncClient):
    response = await client.get("/health", headers={"X-Request-ID": "req-123"})

    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == "req-123"


async def _create_booking_record(
    db_session: AsyncSession,
    *,
    code: str,
    booking_status: BookingStatus,
    unit_status: UnitStatus,
    check_in: date,
    check_out: date,
) -> tuple[Booking, Unit]:
    unit = Unit(name=f"Unit {code}", code=code, status=unit_status)
    customer = Customer(
        full_name=f"Customer {code}",
        phone=f"050{uuid.uuid4().int % 10000000:07d}",
    )
    db_session.add_all([unit, customer])
    await db_session.commit()
    await db_session.refresh(unit)
    await db_session.refresh(customer)

    booking = Booking(
        unit_id=unit.id,
        customer_id=customer.id,
        check_in=check_in,
        check_out=check_out,
        total_cost=1000,
        tax_amount=150,
        deposit_amount=200,
        status=booking_status,
    )
    db_session.add(booking)
    await db_session.commit()
    await db_session.refresh(booking)
    return booking, unit


@pytest.mark.asyncio
async def test_auto_checkout_task_uses_async_session(db_session: AsyncSession):
    booking, unit = await _create_booking_record(
        db_session,
        code="AUTO-CHK-1",
        booking_status=BookingStatus.CHECKED_IN,
        unit_status=UnitStatus.OCCUPIED,
        check_in=date.today() - timedelta(days=3),
        check_out=date.today() - timedelta(days=1),
    )

    result = await _auto_checkout_expired_bookings(TestSessionLocal)

    await db_session.refresh(booking)
    await db_session.refresh(unit)
    cleaning_task = (
        await db_session.execute(
            select(CleaningTask).where(CleaningTask.booking_id == booking.id)
        )
    ).scalar_one_or_none()

    assert result["processed"] >= 1
    assert booking.status == BookingStatus.CHECKED_OUT
    assert unit.status == UnitStatus.WAITING_CLEANING
    assert cleaning_task is not None


@pytest.mark.asyncio
async def test_manual_checkout_task_updates_single_booking(db_session: AsyncSession):
    booking, unit = await _create_booking_record(
        db_session,
        code="MANUAL-CHK-1",
        booking_status=BookingStatus.CHECKED_IN,
        unit_status=UnitStatus.OCCUPIED,
        check_in=date.today() - timedelta(days=2),
        check_out=date.today(),
    )

    result = await _trigger_booking_checkout(str(booking.id), TestSessionLocal)

    await db_session.refresh(booking)
    await db_session.refresh(unit)

    assert result["processed"] == 1
    assert booking.status == BookingStatus.CHECKED_OUT
    assert unit.status == UnitStatus.WAITING_CLEANING


@pytest.mark.asyncio
async def test_checkin_reminder_task_counts_confirmed_bookings(db_session: AsyncSession):
    await _create_booking_record(
        db_session,
        code="REM-CHK-1",
        booking_status=BookingStatus.CONFIRMED,
        unit_status=UnitStatus.RESERVED,
        check_in=date.today() + timedelta(days=1),
        check_out=date.today() + timedelta(days=3),
    )

    result = await _send_checkin_reminders(TestSessionLocal)

    assert result["reminders_sent"] >= 1