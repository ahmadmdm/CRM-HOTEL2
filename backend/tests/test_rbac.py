from datetime import date

import pytest
from httpx import AsyncClient

from app.domain.models.operation import CleaningTask, MaintenanceTicket, TaskStatus, TicketPriority
from app.domain.models.unit import Unit, UnitStatus
from app.domain.models.user import UserRole


@pytest.mark.asyncio
async def test_finance_summary_allows_financial_and_blocks_operations(
    client: AsyncClient,
    create_user,
    make_auth_headers,
):
    today = date.today().isoformat()
    financial_headers = make_auth_headers(
        await create_user(UserRole.FINANCIAL, email="financial@test.com", full_name="Financial User")
    )
    operations_headers = make_auth_headers(
        await create_user(UserRole.OPERATIONS, email="operations@test.com", full_name="Operations User")
    )

    allowed = await client.get(
        f"/api/v1/finance/summary?start_date={today}&end_date={today}",
        headers=financial_headers,
    )
    blocked = await client.get(
        f"/api/v1/finance/summary?start_date={today}&end_date={today}",
        headers=operations_headers,
    )

    assert allowed.status_code == 200
    assert blocked.status_code == 403


@pytest.mark.asyncio
async def test_bookings_list_allows_operations_and_blocks_financial(
    client: AsyncClient,
    create_user,
    make_auth_headers,
):
    operations_headers = make_auth_headers(
        await create_user(UserRole.OPERATIONS, email="operations-booking@test.com", full_name="Operations Booking User")
    )
    financial_headers = make_auth_headers(
        await create_user(UserRole.FINANCIAL, email="financial-booking@test.com", full_name="Financial Booking User")
    )

    allowed = await client.get("/api/v1/bookings", headers=operations_headers)
    blocked = await client.get("/api/v1/bookings", headers=financial_headers)

    assert allowed.status_code == 200
    assert blocked.status_code == 403


@pytest.mark.asyncio
async def test_cleaning_status_update_allows_housekeeping_and_blocks_financial(
    client: AsyncClient,
    db_session,
    create_user,
    make_auth_headers,
):
    housekeeping_headers = make_auth_headers(
        await create_user(UserRole.HOUSEKEEPING, email="housekeeping@test.com", full_name="Housekeeping User")
    )
    financial_headers = make_auth_headers(
        await create_user(UserRole.FINANCIAL, email="financial-cleaning@test.com", full_name="Financial Cleaning User")
    )

    unit = Unit(name="Cleaning Unit", code="CLN-101", price_per_night=220, status=UnitStatus.WAITING_CLEANING)
    db_session.add(unit)
    await db_session.flush()

    task = CleaningTask(unit_id=unit.id, status=TaskStatus.PENDING)
    db_session.add(task)
    await db_session.commit()
    await db_session.refresh(task)

    allowed = await client.patch(
        f"/api/v1/operations/cleaning/{task.id}/status",
        json={"status": "done"},
        headers=housekeeping_headers,
    )
    blocked = await client.patch(
        f"/api/v1/operations/cleaning/{task.id}/status",
        json={"status": "done"},
        headers=financial_headers,
    )

    assert allowed.status_code == 200
    assert blocked.status_code == 403


@pytest.mark.asyncio
async def test_cleaning_task_creation_allows_operations_and_blocks_financial(
    client: AsyncClient,
    db_session,
    create_user,
    make_auth_headers,
):
    operations_headers = make_auth_headers(
        await create_user(
            UserRole.OPERATIONS,
            email="operations-cleaning@test.com",
            full_name="Operations Cleaning User",
        )
    )
    financial_headers = make_auth_headers(
        await create_user(
            UserRole.FINANCIAL,
            email="financial-cleaning-create@test.com",
            full_name="Financial Cleaning Create User",
        )
    )

    unit = Unit(name="Manual Cleaning Unit", code="CLN-201", price_per_night=240, status=UnitStatus.READY)
    db_session.add(unit)
    await db_session.commit()
    await db_session.refresh(unit)

    allowed = await client.post(
        "/api/v1/operations/cleaning",
        json={"unit_id": str(unit.id), "notes": "Manual cleaning request"},
        headers=operations_headers,
    )
    blocked = await client.post(
        "/api/v1/operations/cleaning",
        json={"unit_id": str(unit.id), "notes": "Blocked request"},
        headers=financial_headers,
    )

    assert allowed.status_code == 200
    assert allowed.json()["unit_id"] == str(unit.id)
    assert allowed.json()["assigned_to"] is None
    assert blocked.status_code == 403


@pytest.mark.asyncio
async def test_housekeeping_queue_includes_unassigned_cleaning_tasks(
    client: AsyncClient,
    db_session,
    create_user,
    make_auth_headers,
):
    housekeeping_user = await create_user(
        UserRole.HOUSEKEEPING,
        email="housekeeping-queue@test.com",
        full_name="Housekeeping Queue User",
    )
    housekeeping_headers = make_auth_headers(housekeeping_user)

    unit = Unit(name="Shared Queue Unit", code="CLN-202", price_per_night=210, status=UnitStatus.WAITING_CLEANING)
    db_session.add(unit)
    await db_session.flush()

    assigned_task = CleaningTask(unit_id=unit.id, assigned_to=housekeeping_user.id, status=TaskStatus.PENDING)
    unassigned_task = CleaningTask(unit_id=unit.id, status=TaskStatus.PENDING)
    db_session.add_all([assigned_task, unassigned_task])
    await db_session.commit()

    response = await client.get(
        "/api/v1/operations/cleaning/my-tasks",
        headers=housekeeping_headers,
    )

    assert response.status_code == 200
    returned_ids = {item["id"] for item in response.json()}
    assert str(assigned_task.id) in returned_ids
    assert str(unassigned_task.id) in returned_ids


@pytest.mark.asyncio
async def test_unit_status_change_allows_operations_and_blocks_financial(
    client: AsyncClient,
    db_session,
    create_user,
    make_auth_headers,
):
    operations_headers = make_auth_headers(
        await create_user(
            UserRole.OPERATIONS,
            email="operations-unit-status@test.com",
            full_name="Operations Unit Status User",
        )
    )
    financial_headers = make_auth_headers(
        await create_user(
            UserRole.FINANCIAL,
            email="financial-unit-status@test.com",
            full_name="Financial Unit Status User",
        )
    )

    unit = Unit(name="Status Flow Unit", code="UNT-403", price_per_night=260, status=UnitStatus.READY)
    db_session.add(unit)
    await db_session.commit()
    await db_session.refresh(unit)

    allowed = await client.patch(
        f"/api/v1/units/{unit.id}/status",
        json={"status": "maintenance", "reason": "Operational escalation"},
        headers=operations_headers,
    )
    blocked = await client.patch(
        f"/api/v1/units/{unit.id}/status",
        json={"status": "vacant", "reason": "Blocked by finance role"},
        headers=financial_headers,
    )

    assert allowed.status_code == 200
    assert allowed.json()["status"] == "maintenance"
    assert blocked.status_code == 403


@pytest.mark.asyncio
async def test_maintenance_status_update_allows_maintenance_and_blocks_housekeeping(
    client: AsyncClient,
    db_session,
    create_user,
    make_auth_headers,
):
    maintenance_user = await create_user(
        UserRole.MAINTENANCE,
        email="maintenance@test.com",
        full_name="Maintenance User",
    )
    maintenance_headers = make_auth_headers(maintenance_user)
    housekeeping_headers = make_auth_headers(
        await create_user(UserRole.HOUSEKEEPING, email="housekeeping-maint@test.com", full_name="Housekeeping Maint User")
    )

    unit = Unit(name="Maintenance Unit", code="MNT-101", price_per_night=260, status=UnitStatus.MAINTENANCE)
    db_session.add(unit)
    await db_session.flush()

    ticket = MaintenanceTicket(
        unit_id=unit.id,
        created_by=maintenance_user.id,
        title="Urgent AC issue",
        priority=TicketPriority.URGENT,
    )
    db_session.add(ticket)
    await db_session.commit()
    await db_session.refresh(ticket)

    allowed = await client.patch(
        f"/api/v1/operations/maintenance/{ticket.id}/status",
        json={"status": "resolved", "resolution_notes": "Fixed"},
        headers=maintenance_headers,
    )
    blocked = await client.patch(
        f"/api/v1/operations/maintenance/{ticket.id}/status",
        json={"status": "resolved", "resolution_notes": "Blocked"},
        headers=housekeeping_headers,
    )

    assert allowed.status_code == 200
    assert blocked.status_code == 403


@pytest.mark.asyncio
async def test_inactive_user_token_is_rejected(
    client: AsyncClient,
    create_user,
    make_auth_headers,
):
    today = date.today().isoformat()
    inactive_financial_headers = make_auth_headers(
        await create_user(
            UserRole.FINANCIAL,
            email="inactive-financial@test.com",
            full_name="Inactive Financial User",
            is_active=False,
        )
    )

    response = await client.get(
        f"/api/v1/finance/summary?start_date={today}&end_date={today}",
        headers=inactive_financial_headers,
    )

    assert response.status_code == 401