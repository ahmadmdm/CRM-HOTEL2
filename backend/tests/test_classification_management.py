from datetime import date

import pytest
from httpx import AsyncClient

from app.domain.models.user import UserRole


@pytest.mark.asyncio
async def test_unit_classification_management_contract_and_filters(
    client: AsyncClient,
    admin_headers: dict,
    create_user,
):
    manager = await create_user(
        UserRole.OPERATIONS,
        email="classification-manager@test.com",
        full_name="Classification Manager",
    )

    location_response = await client.post(
        "/api/v1/locations",
        json={"name": "المجمع الشمالي", "code": "north-site", "kind": "site", "city": "Riyadh"},
        headers=admin_headers,
    )
    assert location_response.status_code == 200
    location = location_response.json()
    assert location["code"] == "NORTH-SITE"

    owner_response = await client.post(
        "/api/v1/management/owners",
        json={"name": "مالك خارجي", "owner_type": "individual", "phone": "0500000001"},
        headers=admin_headers,
    )
    assert owner_response.status_code == 200
    owner = owner_response.json()

    entity_response = await client.post(
        "/api/v1/management/entities",
        json={"name": "إدارة التشغيل", "code": "ops-mgmt", "manager_id": str(manager.id)},
        headers=admin_headers,
    )
    assert entity_response.status_code == 200
    entity = entity_response.json()
    assert entity["code"] == "OPS-MGMT"

    group_response = await client.post(
        "/api/v1/management/property-groups",
        json={
            "name": "مجموعة الشمال",
            "code": "north-group",
            "owner_id": owner["id"],
            "management_entity_id": entity["id"],
            "location_id": location["id"],
        },
        headers=admin_headers,
    )
    assert group_response.status_code == 200
    group = group_response.json()

    unit_response = await client.post(
        "/api/v1/units",
        json={
            "name": "Managed Unit",
            "code": "MGD-101",
            "price_per_night": 350,
            "location_id": location["id"],
            "owner_id": owner["id"],
            "management_entity_id": entity["id"],
            "property_group_id": group["id"],
            "is_managed_by_us": True,
            "admin_fee_percent": 12.5,
        },
        headers=admin_headers,
    )
    assert unit_response.status_code == 200
    unit = unit_response.json()
    assert unit["location_id"] == location["id"]
    assert unit["owner_id"] == owner["id"]
    assert unit["is_managed_by_us"] is True
    assert unit["admin_fee_percent"] == 12.5

    contract_response = await client.post(
        "/api/v1/management/contracts",
        json={
            "unit_id": unit["id"],
            "owner_id": owner["id"],
            "management_entity_id": entity["id"],
            "property_group_id": group["id"],
            "starts_on": date.today().isoformat(),
            "admin_fee_percent": 15,
            "status": "active",
        },
        headers=admin_headers,
    )
    assert contract_response.status_code == 200
    assert contract_response.json()["admin_fee_percent"] == 15

    refreshed_unit = await client.get(f"/api/v1/units/{unit['id']}", headers=admin_headers)
    assert refreshed_unit.status_code == 200
    assert refreshed_unit.json()["admin_fee_percent"] == 15

    filtered_by_location = await client.get(
        f"/api/v1/units?location_id={location['id']}", headers=admin_headers
    )
    filtered_by_owner = await client.get(
        f"/api/v1/units?owner_id={owner['id']}", headers=admin_headers
    )
    filtered_by_management = await client.get(
        f"/api/v1/units?management_entity_id={entity['id']}", headers=admin_headers
    )

    assert filtered_by_location.status_code == 200
    assert filtered_by_owner.status_code == 200
    assert filtered_by_management.status_code == 200
    assert any(item["id"] == unit["id"] for item in filtered_by_location.json()["items"])
    assert any(item["id"] == unit["id"] for item in filtered_by_owner.json()["items"])
    assert any(item["id"] == unit["id"] for item in filtered_by_management.json()["items"])


@pytest.mark.asyncio
async def test_formal_team_creation_assignment_and_unit_filter(
    client: AsyncClient,
    admin_headers: dict,
    create_user,
):
    supervisor = await create_user(
        UserRole.OPERATIONS,
        email="team-supervisor@test.com",
        full_name="Team Supervisor",
    )
    housekeeping = await create_user(
        UserRole.HOUSEKEEPING,
        email="team-housekeeping@test.com",
        full_name="Team Housekeeping",
    )

    unit_response = await client.post(
        "/api/v1/units",
        json={"name": "Team Filter Unit", "code": "TEAM-FILTER-101", "price_per_night": 280},
        headers=admin_headers,
    )
    assert unit_response.status_code == 200
    unit = unit_response.json()

    team_response = await client.post(
        "/api/v1/teams",
        json={
            "name": "فريق تنظيف A",
            "code": "hk-a",
            "team_type": "housekeeping",
            "supervisor_id": str(supervisor.id),
            "member_ids": [str(housekeeping.id)],
        },
        headers=admin_headers,
    )
    assert team_response.status_code == 200
    team = team_response.json()
    assert team["code"] == "HK-A"
    assert team["members"][0]["user"]["id"] == str(housekeeping.id)

    assignment_response = await client.post(
        "/api/v1/teams/assignments",
        json={"unit_id": unit["id"], "team_id": team["id"], "is_primary": True},
        headers=admin_headers,
    )
    assert assignment_response.status_code == 200
    assert assignment_response.json()["unit_id"] == unit["id"]

    filtered = await client.get(f"/api/v1/units?team_id={team['id']}", headers=admin_headers)
    assert filtered.status_code == 200
    assert any(item["id"] == unit["id"] for item in filtered.json()["items"])


@pytest.mark.asyncio
async def test_team_rejects_member_with_wrong_role(
    client: AsyncClient,
    admin_headers: dict,
    create_user,
):
    maintenance = await create_user(
        UserRole.MAINTENANCE,
        email="wrong-housekeeping-member@test.com",
        full_name="Wrong Housekeeping Member",
    )

    response = await client.post(
        "/api/v1/teams",
        json={
            "name": "Invalid Housekeeping Team",
            "code": "invalid-hk",
            "team_type": "housekeeping",
            "member_ids": [str(maintenance.id)],
        },
        headers=admin_headers,
    )

    assert response.status_code == 422