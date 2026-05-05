import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.models.unit import Unit, UnitStatus
from app.domain.models.customer import Customer


@pytest.mark.asyncio
async def test_create_booking(
    client: AsyncClient,
    admin_headers: dict,
    db_session: AsyncSession,
):
    # Create unit
    unit = Unit(name="شقة C201", code="C201", status=UnitStatus.VACANT)
    db_session.add(unit)
    # Create customer
    customer = Customer(full_name="محمد أحمد", phone="0501234567")
    db_session.add(customer)
    await db_session.commit()
    await db_session.refresh(unit)
    await db_session.refresh(customer)

    response = await client.post(
        "/api/v1/bookings",
        json={
            "unit_id": str(unit.id),
            "customer_id": str(customer.id),
            "check_in": "2026-06-01",
            "check_out": "2026-06-05",
            "total_cost": 1000.0,
            "tax_amount": 150.0,
            "deposit_amount": 500.0,
        },
        headers=admin_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "confirmed"
    assert data["unit_id"] == str(unit.id)


@pytest.mark.asyncio
async def test_booking_invalid_dates(
    client: AsyncClient, admin_headers: dict, db_session: AsyncSession
):
    unit = Unit(name="شقة D301", code="D301", status=UnitStatus.VACANT)
    customer = Customer(full_name="خالد سعد", phone="0509876543")
    db_session.add(unit)
    db_session.add(customer)
    await db_session.commit()
    await db_session.refresh(unit)
    await db_session.refresh(customer)

    response = await client.post(
        "/api/v1/bookings",
        json={
            "unit_id": str(unit.id),
            "customer_id": str(customer.id),
            "check_in": "2026-06-10",
            "check_out": "2026-06-05",  # invalid: checkout before checkin
            "total_cost": 500.0,
        },
        headers=admin_headers,
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_blacklisted_customer_cannot_book(
    client: AsyncClient, admin_headers: dict, db_session: AsyncSession
):
    unit = Unit(name="شقة E401", code="E401", status=UnitStatus.VACANT)
    customer = Customer(
        full_name="علي مرفوض",
        phone="0501111111",
        is_blacklisted=True,
        blacklist_reason="عدم الدفع",
    )
    db_session.add(unit)
    db_session.add(customer)
    await db_session.commit()
    await db_session.refresh(unit)
    await db_session.refresh(customer)

    response = await client.post(
        "/api/v1/bookings",
        json={
            "unit_id": str(unit.id),
            "customer_id": str(customer.id),
            "check_in": "2026-07-01",
            "check_out": "2026-07-05",
            "total_cost": 800.0,
        },
        headers=admin_headers,
    )
    assert response.status_code == 403
