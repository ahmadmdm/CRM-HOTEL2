"""accounting invoicing

Revision ID: 0004_acct_inv
Revises: 0003_unit_mgmt
Create Date: 2026-05-07 13:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "0004_acct_inv"
down_revision: Union[str, None] = "0003_unit_mgmt"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    ]


def upgrade() -> None:
    account_type = postgresql.ENUM("asset", "liability", "equity", "revenue", "expense", name="account_type", create_type=False)
    journal_source = postgresql.ENUM("manual", "revenue", "expense", "invoice", "payment", "owner_statement", name="journal_source", create_type=False)
    journal_status = postgresql.ENUM("draft", "posted", "void", name="journal_status", create_type=False)
    invoice_status = postgresql.ENUM("draft", "issued", "partially_paid", "paid", "overdue", "cancelled", name="invoice_status", create_type=False)
    invoice_recipient_type = postgresql.ENUM("customer", "owner", name="invoice_recipient_type", create_type=False)
    invoice_line_type = postgresql.ENUM(
        "accommodation",
        "service",
        "tax",
        "deposit",
        "management_fee",
        "owner_revenue",
        "owner_expense",
        "adjustment",
        name="invoice_line_type",
        create_type=False,
    )
    invoice_payment_method = postgresql.ENUM("cash", "bank_transfer", "card", "online", "other", name="invoice_payment_method", create_type=False)

    bind = op.get_bind()
    account_type.create(bind, checkfirst=True)
    journal_source.create(bind, checkfirst=True)
    journal_status.create(bind, checkfirst=True)
    invoice_status.create(bind, checkfirst=True)
    invoice_recipient_type.create(bind, checkfirst=True)
    invoice_line_type.create(bind, checkfirst=True)
    invoice_payment_method.create(bind, checkfirst=True)

    op.create_table(
        "accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(30), nullable=False, unique=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("account_type", account_type, nullable=False),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("description", sa.Text(), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(["parent_id"], ["accounts.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_accounts_code", "accounts", ["code"])
    op.create_index("ix_accounts_type", "accounts", ["account_type"])
    op.create_index("ix_accounts_parent_id", "accounts", ["parent_id"])
    op.create_index("ix_accounts_is_active", "accounts", ["is_active"])

    op.create_table(
        "journal_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("entry_number", sa.String(50), nullable=False, unique=True),
        sa.Column("entry_date", sa.Date(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("source", journal_source, nullable=False),
        sa.Column("source_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("status", journal_status, nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("posted_at", sa.DateTime(timezone=True), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_journal_entries_entry_number", "journal_entries", ["entry_number"])
    op.create_index("ix_journal_entries_entry_date", "journal_entries", ["entry_date"])
    op.create_index("ix_journal_entries_source", "journal_entries", ["source", "source_id"])
    op.create_index("ix_journal_entries_source_id", "journal_entries", ["source_id"])
    op.create_index("ix_journal_entries_status", "journal_entries", ["status"])

    op.create_table(
        "invoice_sequences",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("sequence_key", sa.String(50), nullable=False, unique=True),
        sa.Column("prefix", sa.String(20), nullable=False),
        sa.Column("next_number", sa.Integer(), nullable=False, server_default="1"),
        *_timestamps(),
    )
    op.create_index("ix_invoice_sequences_key", "invoice_sequences", ["sequence_key"])

    op.create_table(
        "invoices",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("invoice_number", sa.String(50), nullable=False, unique=True),
        sa.Column("recipient_type", invoice_recipient_type, nullable=False),
        sa.Column("status", invoice_status, nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("booking_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("unit_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("journal_entry_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("issue_date", sa.Date(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("period_start", sa.Date(), nullable=True),
        sa.Column("period_end", sa.Date(), nullable=True),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("tax_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("discount_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("amount_paid", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("notes", sa.Text(), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["owner_id"], ["owners.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["unit_id"], ["units.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["journal_entry_id"], ["journal_entries.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_invoices_invoice_number", "invoices", ["invoice_number"])
    op.create_index("ix_invoices_recipient_status", "invoices", ["recipient_type", "status"])
    op.create_index("ix_invoices_customer_id", "invoices", ["customer_id"])
    op.create_index("ix_invoices_owner_id", "invoices", ["owner_id"])
    op.create_index("ix_invoices_booking_id", "invoices", ["booking_id"])
    op.create_index("ix_invoices_unit_id", "invoices", ["unit_id"])
    op.create_index("ix_invoices_journal_entry_id", "invoices", ["journal_entry_id"])
    op.create_index("ix_invoices_issue_date", "invoices", ["issue_date"])
    op.create_index("ix_invoices_period", "invoices", ["period_start", "period_end"])

    op.create_table(
        "journal_lines",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("entry_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("debit", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("credit", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("unit_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("management_entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("booking_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("invoice_id", postgresql.UUID(as_uuid=True), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(["entry_id"], ["journal_entries.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["unit_id"], ["units.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["owner_id"], ["owners.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["management_entity_id"], ["management_entities.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["invoice_id"], ["invoices.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_journal_lines_entry_id", "journal_lines", ["entry_id"])
    op.create_index("ix_journal_lines_account_id", "journal_lines", ["account_id"])
    op.create_index("ix_journal_lines_dimensions", "journal_lines", ["unit_id", "owner_id", "management_entity_id"])
    op.create_index("ix_journal_lines_unit_id", "journal_lines", ["unit_id"])
    op.create_index("ix_journal_lines_owner_id", "journal_lines", ["owner_id"])
    op.create_index("ix_journal_lines_management_entity_id", "journal_lines", ["management_entity_id"])
    op.create_index("ix_journal_lines_booking_id", "journal_lines", ["booking_id"])
    op.create_index("ix_journal_lines_invoice_id", "journal_lines", ["invoice_id"])

    op.create_table(
        "invoice_lines",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("invoice_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("line_type", invoice_line_type, nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("quantity", sa.Numeric(10, 2), nullable=False, server_default="1"),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("tax_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("service_period_start", sa.Date(), nullable=True),
        sa.Column("service_period_end", sa.Date(), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(["invoice_id"], ["invoices.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_invoice_lines_invoice_id", "invoice_lines", ["invoice_id"])

    op.create_table(
        "invoice_payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("invoice_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("journal_entry_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("payment_date", sa.Date(), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("method", invoice_payment_method, nullable=False),
        sa.Column("reference", sa.String(100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(["invoice_id"], ["invoices.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["journal_entry_id"], ["journal_entries.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_invoice_payments_invoice_id", "invoice_payments", ["invoice_id"])
    op.create_index("ix_invoice_payments_journal_entry_id", "invoice_payments", ["journal_entry_id"])
    op.create_index("ix_invoice_payments_payment_date", "invoice_payments", ["payment_date"])

    op.add_column("revenue_records", sa.Column("journal_entry_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_revenue_records_journal_entry_id_journal_entries",
        "revenue_records",
        "journal_entries",
        ["journal_entry_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_revenue_records_journal_entry_id", "revenue_records", ["journal_entry_id"])

    op.add_column("expense_records", sa.Column("journal_entry_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_expense_records_journal_entry_id_journal_entries",
        "expense_records",
        "journal_entries",
        ["journal_entry_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_expense_records_journal_entry_id", "expense_records", ["journal_entry_id"])


def downgrade() -> None:
    op.drop_index("ix_expense_records_journal_entry_id", table_name="expense_records")
    op.drop_constraint("fk_expense_records_journal_entry_id_journal_entries", "expense_records", type_="foreignkey")
    op.drop_column("expense_records", "journal_entry_id")

    op.drop_index("ix_revenue_records_journal_entry_id", table_name="revenue_records")
    op.drop_constraint("fk_revenue_records_journal_entry_id_journal_entries", "revenue_records", type_="foreignkey")
    op.drop_column("revenue_records", "journal_entry_id")

    op.drop_index("ix_invoice_payments_payment_date", table_name="invoice_payments")
    op.drop_index("ix_invoice_payments_journal_entry_id", table_name="invoice_payments")
    op.drop_index("ix_invoice_payments_invoice_id", table_name="invoice_payments")
    op.drop_table("invoice_payments")

    op.drop_index("ix_invoice_lines_invoice_id", table_name="invoice_lines")
    op.drop_table("invoice_lines")

    op.drop_index("ix_journal_lines_invoice_id", table_name="journal_lines")
    op.drop_index("ix_journal_lines_booking_id", table_name="journal_lines")
    op.drop_index("ix_journal_lines_management_entity_id", table_name="journal_lines")
    op.drop_index("ix_journal_lines_owner_id", table_name="journal_lines")
    op.drop_index("ix_journal_lines_unit_id", table_name="journal_lines")
    op.drop_index("ix_journal_lines_dimensions", table_name="journal_lines")
    op.drop_index("ix_journal_lines_account_id", table_name="journal_lines")
    op.drop_index("ix_journal_lines_entry_id", table_name="journal_lines")
    op.drop_table("journal_lines")

    op.drop_index("ix_invoices_period", table_name="invoices")
    op.drop_index("ix_invoices_issue_date", table_name="invoices")
    op.drop_index("ix_invoices_journal_entry_id", table_name="invoices")
    op.drop_index("ix_invoices_unit_id", table_name="invoices")
    op.drop_index("ix_invoices_booking_id", table_name="invoices")
    op.drop_index("ix_invoices_owner_id", table_name="invoices")
    op.drop_index("ix_invoices_customer_id", table_name="invoices")
    op.drop_index("ix_invoices_recipient_status", table_name="invoices")
    op.drop_index("ix_invoices_invoice_number", table_name="invoices")
    op.drop_table("invoices")

    op.drop_index("ix_invoice_sequences_key", table_name="invoice_sequences")
    op.drop_table("invoice_sequences")

    op.drop_index("ix_journal_entries_status", table_name="journal_entries")
    op.drop_index("ix_journal_entries_source_id", table_name="journal_entries")
    op.drop_index("ix_journal_entries_source", table_name="journal_entries")
    op.drop_index("ix_journal_entries_entry_date", table_name="journal_entries")
    op.drop_index("ix_journal_entries_entry_number", table_name="journal_entries")
    op.drop_table("journal_entries")

    op.drop_index("ix_accounts_is_active", table_name="accounts")
    op.drop_index("ix_accounts_parent_id", table_name="accounts")
    op.drop_index("ix_accounts_type", table_name="accounts")
    op.drop_index("ix_accounts_code", table_name="accounts")
    op.drop_table("accounts")

    bind = op.get_bind()
    postgresql.ENUM(name="invoice_payment_method").drop(bind, checkfirst=True)
    postgresql.ENUM(name="invoice_line_type").drop(bind, checkfirst=True)
    postgresql.ENUM(name="invoice_recipient_type").drop(bind, checkfirst=True)
    postgresql.ENUM(name="invoice_status").drop(bind, checkfirst=True)
    postgresql.ENUM(name="journal_status").drop(bind, checkfirst=True)
    postgresql.ENUM(name="journal_source").drop(bind, checkfirst=True)
    postgresql.ENUM(name="account_type").drop(bind, checkfirst=True)