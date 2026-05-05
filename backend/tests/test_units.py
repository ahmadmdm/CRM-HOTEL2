import pytest
from httpx import AsyncClient

from app.domain.models.user import UserRole


@pytest.mark.asyncio
async def test_create_unit(client: AsyncClient, admin_headers: dict):
    response = await client.post(
        "/api/v1/units",
        json={
            "name": "شقة A101",
            "code": "A101",
            "price_per_night": 250.00,
            "price_per_month": 4500.00,
            "location": "الطابق الأول - المبنى A",
        },
        headers=admin_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == "A101"
    assert data["status"] == "vacant"


@pytest.mark.asyncio
async def test_create_unit_duplicate_code(client: AsyncClient, admin_headers: dict):
    payload = {"name": "شقة B102", "code": "B102", "price_per_night": 200.0}
    await client.post("/api/v1/units", json=payload, headers=admin_headers)
    response = await client.post("/api/v1/units", json=payload, headers=admin_headers)
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_list_units(client: AsyncClient, admin_headers: dict):
    response = await client.get("/api/v1/units", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_get_unit_not_found(client: AsyncClient, admin_headers: dict):
    import uuid
    response = await client.get(
        f"/api/v1/units/{uuid.uuid4()}", headers=admin_headers
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_unit_status_summary(client: AsyncClient, admin_headers: dict):
    response = await client.get("/api/v1/units/status-summary", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "vacant" in data


@pytest.mark.asyncio
async def test_create_unit_with_supervisor_and_shared_teams(
    client: AsyncClient,
    admin_headers: dict,
    create_user,
):
    supervisor = await create_user(
        UserRole.SUB_ADMIN,
        email="unit-supervisor@test.com",
        full_name="Unit Supervisor",
    )
    housekeeping = await create_user(
        UserRole.HOUSEKEEPING,
        email="unit-housekeeping@test.com",
        full_name="Unit Housekeeping",
    )
    maintenance = await create_user(
        UserRole.MAINTENANCE,
        email="unit-maintenance@test.com",
        full_name="Unit Maintenance",
    )

    response = await client.post(
        "/api/v1/units",
        json={
            "name": "شقة Team-101",
            "code": "TEAM-101",
            "price_per_night": 275.00,
            "supervisor_id": str(supervisor.id),
            "housekeeping_team_ids": [str(housekeeping.id)],
            "maintenance_team_ids": [str(maintenance.id)],
        },
        headers=admin_headers,
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["supervisor"]["id"] == str(supervisor.id)
    assert payload["housekeeping_team"][0]["id"] == str(housekeeping.id)
    assert payload["maintenance_team"][0]["id"] == str(maintenance.id)


@pytest.mark.asyncio
async def test_update_unit_assignments_can_reuse_same_staff_across_units(
    client: AsyncClient,
    admin_headers: dict,
    create_user,
):
    supervisor = await create_user(
        UserRole.OPERATIONS,
        email="shared-supervisor@test.com",
        full_name="Shared Supervisor",
    )
    housekeeping = await create_user(
        UserRole.HOUSEKEEPING,
        email="shared-housekeeping@test.com",
        full_name="Shared Housekeeping",
    )
    maintenance = await create_user(
        UserRole.MAINTENANCE,
        email="shared-maintenance@test.com",
        full_name="Shared Maintenance",
    )

    first = await client.post(
        "/api/v1/units",
        json={"name": "Unit One", "code": "TEAM-201", "price_per_night": 250.0},
        headers=admin_headers,
    )
    second = await client.post(
        "/api/v1/units",
        json={"name": "Unit Two", "code": "TEAM-202", "price_per_night": 255.0},
        headers=admin_headers,
    )
    assert first.status_code == 200
    assert second.status_code == 200

    for unit_id in [first.json()["id"], second.json()["id"]]:
        response = await client.patch(
            f"/api/v1/units/{unit_id}",
            json={
                "supervisor_id": str(supervisor.id),
                "housekeeping_team_ids": [str(housekeeping.id)],
                "maintenance_team_ids": [str(maintenance.id)],
            },
            headers=admin_headers,
        )
        assert response.status_code == 200

    users_response = await client.get("/api/v1/users", headers=admin_headers)
    assert users_response.status_code == 200
    users = users_response.json()["items"]
    supervisor_payload = next(user for user in users if user["id"] == str(supervisor.id))
    housekeeping_payload = next(user for user in users if user["id"] == str(housekeeping.id))
    maintenance_payload = next(user for user in users if user["id"] == str(maintenance.id))

    assert len(supervisor_payload["supervised_units"]) == 2
    assert len(housekeeping_payload["housekeeping_units"]) == 2
    assert len(maintenance_payload["maintenance_units"]) == 2
