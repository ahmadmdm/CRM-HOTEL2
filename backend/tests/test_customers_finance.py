from datetime import date

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.unit import Unit, UnitStatus


@pytest.mark.asyncio
async def test_customer_blacklist_flow(client: AsyncClient, admin_headers: dict):
    create_response = await client.post(
        "/api/v1/customers",
        json={
            "full_name": "Customer Flow",
            "email": "customer-flow@test.com",
            "phone": "0501234568",
        },
        headers=admin_headers,
    )

    assert create_response.status_code == 200
    customer = create_response.json()
    customer_id = customer["id"]
    assert customer["is_blacklisted"] is False

    blacklist_response = await client.post(
        f"/api/v1/customers/{customer_id}/blacklist",
        json={"reason": "Repeated payment failure"},
        headers=admin_headers,
    )

    assert blacklist_response.status_code == 200
    assert blacklist_response.json()["is_blacklisted"] is True
    assert blacklist_response.json()["blacklist_reason"] == "Repeated payment failure"

    listed_response = await client.get(
        "/api/v1/customers?is_blacklisted=true",
        headers=admin_headers,
    )

    assert listed_response.status_code == 200
    listed_payload = listed_response.json()
    assert listed_payload["total"] >= 1
    assert any(item["id"] == customer_id for item in listed_payload["items"])

    remove_response = await client.delete(
        f"/api/v1/customers/{customer_id}/blacklist",
        headers=admin_headers,
    )

    assert remove_response.status_code == 200
    assert remove_response.json()["is_blacklisted"] is False
    assert remove_response.json()["blacklist_reason"] is None


@pytest.mark.asyncio
async def test_finance_revenue_expense_and_summary_flow(
    client: AsyncClient,
    financial_headers: dict,
    db_session: AsyncSession,
):
    unit = Unit(name="Finance Unit", code="FIN-100", status=UnitStatus.READY)
    db_session.add(unit)
    await db_session.commit()
    await db_session.refresh(unit)

    today = date.today().isoformat()

    revenue_response = await client.post(
        "/api/v1/finance/revenue",
        json={
            "unit_id": str(unit.id),
            "amount": 2500,
            "category": "rent",
            "description": "Monthly rent",
            "record_date": today,
        },
        headers=financial_headers,
    )

    assert revenue_response.status_code == 200
    revenue_payload = revenue_response.json()
    assert revenue_payload["amount"] == 2500
    assert revenue_payload["category"] == "rent"

    expense_response = await client.post(
        "/api/v1/finance/expense",
        json={
            "unit_id": str(unit.id),
            "amount": 400,
            "category": "maintenance_cost",
            "description": "Emergency maintenance",
            "record_date": today,
        },
        headers=financial_headers,
    )

    assert expense_response.status_code == 200
    expense_payload = expense_response.json()
    assert expense_payload["amount"] == 400
    assert expense_payload["category"] == "maintenance_cost"

    revenue_list = await client.get(
        f"/api/v1/finance/revenue?unit_id={unit.id}",
        headers=financial_headers,
    )
    expense_list = await client.get(
        f"/api/v1/finance/expense?unit_id={unit.id}",
        headers=financial_headers,
    )
    summary_response = await client.get(
        f"/api/v1/finance/summary?start_date={today}&end_date={today}&unit_id={unit.id}",
        headers=financial_headers,
    )

    assert revenue_list.status_code == 200
    assert expense_list.status_code == 200
    assert summary_response.status_code == 200
    assert revenue_list.json()["total"] >= 1
    assert expense_list.json()["total"] >= 1
    assert summary_response.json()["total_revenue"] == 2500
    assert summary_response.json()["total_expenses"] == 400
    assert summary_response.json()["net_profit"] == 2100