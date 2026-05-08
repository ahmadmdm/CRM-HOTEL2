from datetime import date
from decimal import Decimal
from uuid import UUID

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domain.models.accounting import JournalEntry, JournalLine
from app.domain.models.invoice import Invoice, InvoiceLine, InvoiceRecipientType


@pytest.mark.asyncio
async def test_manual_journal_entry_must_balance(client: AsyncClient, financial_headers: dict):
    accounts_response = await client.get("/api/v1/accounting/accounts", headers=financial_headers)
    assert accounts_response.status_code == 200
    accounts = {account["code"]: account for account in accounts_response.json()}

    response = await client.post(
        "/api/v1/accounting/journal-entries",
        json={
            "entry_date": date.today().isoformat(),
            "description": "Unbalanced entry",
            "source": "manual",
            "lines": [
                {"account_id": accounts["1000"]["id"], "debit": 10},
                {"account_id": accounts["4000"]["id"], "credit": 9},
            ],
        },
        headers=financial_headers,
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_hierarchical_accounts_accept_balanced_manual_entry(client: AsyncClient, financial_headers: dict):
    parent_response = await client.post(
        "/api/v1/accounting/accounts",
        json={
            "code": "6100",
            "name": "Owner services expense",
            "account_type": "expense",
        },
        headers=financial_headers,
    )
    assert parent_response.status_code == 200
    parent = parent_response.json()

    child_response = await client.post(
        "/api/v1/accounting/accounts",
        json={
            "code": "6110",
            "name": "Owner service supplies",
            "account_type": "expense",
            "parent_id": parent["id"],
        },
        headers=financial_headers,
    )
    assert child_response.status_code == 200
    child = child_response.json()
    assert child["parent_id"] == parent["id"]

    accounts_response = await client.get("/api/v1/accounting/accounts", headers=financial_headers)
    assert accounts_response.status_code == 200
    accounts = {account["code"]: account for account in accounts_response.json()}
    assert accounts["6110"]["parent_id"] == accounts["6100"]["id"]

    today = date.today().isoformat()
    entry_response = await client.post(
        "/api/v1/accounting/journal-entries",
        json={
            "entry_date": today,
            "description": "Hierarchical account manual entry",
            "source": "manual",
            "lines": [
                {"account_id": child["id"], "debit": 75, "description": "Service supplies"},
                {"account_id": accounts["1000"]["id"], "credit": 75, "description": "Cash paid"},
            ],
        },
        headers=financial_headers,
    )
    assert entry_response.status_code == 200
    entry = entry_response.json()
    assert sum(line["debit"] for line in entry["lines"]) == sum(line["credit"] for line in entry["lines"])

    trial_balance = await client.get(
        f"/api/v1/accounting/trial-balance?start_date={today}&end_date={today}",
        headers=financial_headers,
    )
    assert trial_balance.status_code == 200
    rows = {item["code"]: item for item in trial_balance.json()["items"]}
    assert rows["6110"]["debit"] == 75
    assert trial_balance.json()["is_balanced"] is True


@pytest.mark.asyncio
async def test_finance_records_create_balanced_journal_entries(
    client: AsyncClient,
    financial_headers: dict,
    admin_headers: dict,
):
    unit_response = await client.post(
        "/api/v1/units",
        json={"name": "Accounting Unit", "code": "ACCT-100", "price_per_night": 500},
        headers=admin_headers,
    )
    assert unit_response.status_code == 200
    unit = unit_response.json()
    today = date.today().isoformat()

    revenue_response = await client.post(
        "/api/v1/finance/revenue",
        json={
            "unit_id": unit["id"],
            "amount": 1000,
            "category": "rent",
            "description": "Rent received",
            "record_date": today,
        },
        headers=financial_headers,
    )
    assert revenue_response.status_code == 200
    assert revenue_response.json()["journal_entry_id"] is not None

    expense_response = await client.post(
        "/api/v1/finance/expense",
        json={
            "unit_id": unit["id"],
            "amount": 250,
            "category": "cleaning_cost",
            "description": "Cleaning",
            "record_date": today,
        },
        headers=financial_headers,
    )
    assert expense_response.status_code == 200
    assert expense_response.json()["journal_entry_id"] is not None

    trial_balance = await client.get(
        f"/api/v1/accounting/trial-balance?start_date={today}&end_date={today}",
        headers=financial_headers,
    )
    assert trial_balance.status_code == 200
    payload = trial_balance.json()
    assert payload["is_balanced"] is True
    assert payload["total_debit"] == payload["total_credit"]


@pytest.mark.asyncio
async def test_checkout_generates_customer_invoice_and_owner_statement(
    client: AsyncClient,
    admin_headers: dict,
    db_session: AsyncSession,
):
    owner_response = await client.post(
        "/api/v1/management/owners",
        json={"name": "Invoice Owner", "owner_type": "individual", "phone": "0500000099"},
        headers=admin_headers,
    )
    assert owner_response.status_code == 200
    owner = owner_response.json()

    unit_response = await client.post(
        "/api/v1/units",
        json={
            "name": "Managed Invoice Unit",
            "code": "INV-OWN-100",
            "price_per_night": 450,
            "owner_id": owner["id"],
            "is_managed_by_us": True,
            "admin_fee_percent": 10,
        },
        headers=admin_headers,
    )
    assert unit_response.status_code == 200
    unit = unit_response.json()

    customer_response = await client.post(
        "/api/v1/customers",
        json={"full_name": "Invoice Customer", "phone": "0500000098"},
        headers=admin_headers,
    )
    assert customer_response.status_code == 200
    customer = customer_response.json()

    booking_response = await client.post(
        "/api/v1/bookings",
        json={
            "unit_id": unit["id"],
            "customer_id": customer["id"],
            "check_in": "2026-08-01",
            "check_out": "2026-08-05",
            "total_cost": 1000,
            "tax_amount": 150,
            "deposit_amount": 200,
        },
        headers=admin_headers,
    )
    assert booking_response.status_code == 200
    booking = booking_response.json()

    payment_response = await client.patch(
        f"/api/v1/bookings/{booking['id']}/payment",
        json={"amount_paid": 1350, "payment_status": "paid"},
        headers=admin_headers,
    )
    assert payment_response.status_code == 200

    check_in_response = await client.post(
        f"/api/v1/bookings/{booking['id']}/check-in",
        json={},
        headers=admin_headers,
    )
    assert check_in_response.status_code == 200
    check_out_response = await client.post(
        f"/api/v1/bookings/{booking['id']}/check-out",
        json={},
        headers=admin_headers,
    )
    assert check_out_response.status_code == 200

    result = await db_session.execute(
        select(Invoice)
        .options(selectinload(Invoice.lines), selectinload(Invoice.payments))
        .where(Invoice.booking_id == UUID(booking["id"]), Invoice.recipient_type == InvoiceRecipientType.CUSTOMER)
    )
    invoice = result.scalar_one()
    assert invoice.total_amount == Decimal("1350.00")
    assert invoice.amount_paid == Decimal("1350.00")
    assert invoice.status.value == "paid"
    assert len(invoice.payments) == 1

    entry_result = await db_session.execute(
        select(JournalEntry).options(selectinload(JournalEntry.lines)).where(JournalEntry.id == invoice.journal_entry_id)
    )
    invoice_entry = entry_result.scalar_one()
    total_debit = sum(line.debit for line in invoice_entry.lines)
    total_credit = sum(line.credit for line in invoice_entry.lines)
    assert total_debit == total_credit
    assert any(line.credit == Decimal("100.00") for line in invoice_entry.lines)
    assert any(line.debit == Decimal("100.00") for line in invoice_entry.lines)

    expense_response = await client.post(
        "/api/v1/finance/expense",
        json={
            "unit_id": unit["id"],
            "amount": 50,
            "category": "maintenance_cost",
            "description": "Owner period expense",
            "record_date": "2026-08-03",
        },
        headers=admin_headers,
    )
    assert expense_response.status_code == 200

    statement_response = await client.post(
        "/api/v1/invoices/owner-statements",
        json={
            "owner_id": owner["id"],
            "period_start": "2026-08-01",
            "period_end": "2026-08-31",
        },
        headers=admin_headers,
    )
    assert statement_response.status_code == 200
    statement = statement_response.json()
    assert statement["recipient_type"] == "owner"
    assert statement["total_amount"] == 850
    line_types = {line["line_type"] for line in statement["lines"]}
    assert {"owner_revenue", "owner_expense", "management_fee"}.issubset(line_types)


@pytest.mark.asyncio
async def test_owner_statement_uses_contract_rate_for_statement_period(
    client: AsyncClient,
    admin_headers: dict,
):
    owner_response = await client.post(
        "/api/v1/management/owners",
        json={"name": "Historical Rate Owner", "owner_type": "individual", "phone": "0500000199"},
        headers=admin_headers,
    )
    assert owner_response.status_code == 200
    owner = owner_response.json()

    entity_response = await client.post(
        "/api/v1/management/entities",
        json={"name": "Historical Management", "code": "hist-mgmt"},
        headers=admin_headers,
    )
    assert entity_response.status_code == 200
    entity = entity_response.json()

    unit_response = await client.post(
        "/api/v1/units",
        json={
            "name": "Historical Contract Unit",
            "code": "HIST-RATE-100",
            "price_per_night": 450,
            "owner_id": owner["id"],
            "management_entity_id": entity["id"],
            "is_managed_by_us": True,
            "admin_fee_percent": 0,
        },
        headers=admin_headers,
    )
    assert unit_response.status_code == 200
    unit = unit_response.json()

    old_contract_response = await client.post(
        "/api/v1/management/contracts",
        json={
            "unit_id": unit["id"],
            "owner_id": owner["id"],
            "management_entity_id": entity["id"],
            "starts_on": "2026-08-01",
            "ends_on": "2026-08-31",
            "admin_fee_percent": 10,
            "status": "active",
        },
        headers=admin_headers,
    )
    assert old_contract_response.status_code == 200

    new_contract_response = await client.post(
        "/api/v1/management/contracts",
        json={
            "unit_id": unit["id"],
            "owner_id": owner["id"],
            "management_entity_id": entity["id"],
            "starts_on": "2026-09-01",
            "admin_fee_percent": 30,
            "status": "active",
        },
        headers=admin_headers,
    )
    assert new_contract_response.status_code == 200

    customer_response = await client.post(
        "/api/v1/customers",
        json={"full_name": "Historical Rate Customer", "phone": "0500000198"},
        headers=admin_headers,
    )
    assert customer_response.status_code == 200
    customer = customer_response.json()

    booking_response = await client.post(
        "/api/v1/bookings",
        json={
            "unit_id": unit["id"],
            "customer_id": customer["id"],
            "check_in": "2026-08-01",
            "check_out": "2026-08-05",
            "total_cost": 1000,
            "tax_amount": 0,
            "deposit_amount": 0,
        },
        headers=admin_headers,
    )
    assert booking_response.status_code == 200
    booking = booking_response.json()

    assert (await client.post(f"/api/v1/bookings/{booking['id']}/check-in", json={}, headers=admin_headers)).status_code == 200
    assert (await client.post(f"/api/v1/bookings/{booking['id']}/check-out", json={}, headers=admin_headers)).status_code == 200

    statement_response = await client.post(
        "/api/v1/invoices/owner-statements",
        json={
            "owner_id": owner["id"],
            "period_start": "2026-08-01",
            "period_end": "2026-08-31",
        },
        headers=admin_headers,
    )
    assert statement_response.status_code == 200
    statement = statement_response.json()

    assert statement["total_amount"] == 900
    management_fee_line = next(line for line in statement["lines"] if line["line_type"] == "management_fee")
    assert management_fee_line["total_amount"] == -100