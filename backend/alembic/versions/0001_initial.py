"""initial schema

Revision ID: 0001_initial
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── users ─────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column(
            "role",
            sa.Enum(
                "super_admin", "sub_admin", "financial",
                "operations", "maintenance", "housekeeping",
                name="user_role",
                create_type=False,
            ),
            nullable=False,
            server_default="operations",
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_role", "users", ["role"])
    op.create_index("ix_users_is_active", "users", ["is_active"])

    # ── units ─────────────────────────────────────────────────────────────────
    op.create_table(
        "units",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("code", sa.String(50), nullable=False, unique=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("floor", sa.Integer(), nullable=True),
        sa.Column("area_sqm", sa.Numeric(8, 2), nullable=True),
        sa.Column("price_per_night", sa.Numeric(10, 2), nullable=True),
        sa.Column("price_per_month", sa.Numeric(10, 2), nullable=True),
        sa.Column("location", sa.String(500), nullable=True),
        sa.Column("amenities", postgresql.JSONB(), nullable=True, server_default="[]"),
        sa.Column("images", postgresql.JSONB(), nullable=True, server_default="[]"),
        sa.Column("smart_lock_code", sa.String(50), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "vacant", "reserved", "occupied",
                "waiting_cleaning", "ready", "maintenance",
                name="unit_status",
                create_type=False,
            ),
            nullable=False,
            server_default="vacant",
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_units_status", "units", ["status"])
    op.create_index("ix_units_code", "units", ["code"])

    # ── customers ─────────────────────────────────────────────────────────────
    op.create_table(
        "customers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(30), nullable=False),
        sa.Column("national_id", sa.String(50), nullable=True),
        sa.Column("nationality", sa.String(100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_blacklisted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("blacklist_reason", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_customers_email", "customers", ["email"])
    op.create_index("ix_customers_phone", "customers", ["phone"])
    op.create_index("ix_customers_national_id", "customers", ["national_id"])
    op.create_index("ix_customers_full_name", "customers", ["full_name"])
    op.create_index("ix_customers_is_blacklisted", "customers", ["is_blacklisted"])

    # ── bookings ──────────────────────────────────────────────────────────────
    op.create_table(
        "bookings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "unit_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("units.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "customer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("customers.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("check_in", sa.Date(), nullable=False),
        sa.Column("check_out", sa.Date(), nullable=False),
        sa.Column("actual_check_in", sa.DateTime(timezone=True), nullable=True),
        sa.Column("actual_check_out", sa.DateTime(timezone=True), nullable=True),
        sa.Column("total_cost", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("tax_amount", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("deposit_amount", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("amount_paid", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column(
            "status",
            sa.Enum(
                "pending", "confirmed", "checked_in",
                "checked_out", "cancelled", "no_show",
                name="booking_status",
                create_type=False,
            ),
            nullable=False,
            server_default="pending",
        ),
        sa.Column(
            "payment_status",
            sa.Enum("unpaid", "partial", "paid", "refunded", name="payment_status", create_type=False),
            nullable=False,
            server_default="unpaid",
        ),
        sa.Column(
            "booking_channel",
            sa.Enum(
                "direct", "airbnb", "booking_com",
                "agoda", "phone", "walk_in", "other",
                name="booking_channel",
                create_type=False,
            ),
            nullable=False,
            server_default="direct",
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("guests_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_bookings_unit_id", "bookings", ["unit_id"])
    op.create_index("ix_bookings_customer_id", "bookings", ["customer_id"])
    op.create_index("ix_bookings_check_in", "bookings", ["check_in"])
    op.create_index("ix_bookings_check_out", "bookings", ["check_out"])
    op.create_index("ix_bookings_status", "bookings", ["status"])
    op.create_index("ix_bookings_payment_status", "bookings", ["payment_status"])

    # ── revenue_records ───────────────────────────────────────────────────────
    op.create_table(
        "revenue_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "unit_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("units.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "booking_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("bookings.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column(
            "category",
            sa.Enum(
                "rent", "deposit", "late_fee", "service_fee", "other_income",
                "maintenance_cost", "cleaning_cost", "utilities",
                "supplies", "salary", "tax", "other_expense",
                name="finance_category",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("record_date", sa.Date(), nullable=False),
        sa.Column("receipt_path", sa.String(500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_revenue_unit_id", "revenue_records", ["unit_id"])
    op.create_index("ix_revenue_record_date", "revenue_records", ["record_date"])
    op.create_index("ix_revenue_booking_id", "revenue_records", ["booking_id"])

    # ── expense_records ───────────────────────────────────────────────────────
    op.create_table(
        "expense_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "unit_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("units.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column(
            "category",
            postgresql.ENUM(
                "rent", "deposit", "late_fee", "service_fee", "other_income",
                "maintenance_cost", "cleaning_cost", "utilities",
                "supplies", "salary", "tax", "other_expense",
                name="finance_category",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("record_date", sa.Date(), nullable=False),
        sa.Column("receipt_path", sa.String(500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_expense_unit_id", "expense_records", ["unit_id"])
    op.create_index("ix_expense_record_date", "expense_records", ["record_date"])

    # ── cleaning_tasks ─────────────────────────────────────────────────────────
    op.create_table(
        "cleaning_tasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "unit_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("units.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "booking_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("bookings.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "assigned_to",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "status",
            sa.Enum("pending", "in_progress", "done", "skipped", name="task_status", create_type=False),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_cleaning_unit_id", "cleaning_tasks", ["unit_id"])
    op.create_index("ix_cleaning_status", "cleaning_tasks", ["status"])
    op.create_index("ix_cleaning_assigned_to", "cleaning_tasks", ["assigned_to"])

    # ── maintenance_tickets ────────────────────────────────────────────────────
    op.create_table(
        "maintenance_tickets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "unit_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("units.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "assigned_to",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "priority",
            sa.Enum("low", "medium", "high", "urgent", name="ticket_priority", create_type=False),
            nullable=False,
            server_default="medium",
        ),
        sa.Column(
            "status",
            sa.Enum("open", "in_progress", "resolved", "closed", name="ticket_status", create_type=False),
            nullable=False,
            server_default="open",
        ),
        sa.Column("images", postgresql.JSONB(), nullable=True, server_default="[]"),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolution_notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_maintenance_unit_id", "maintenance_tickets", ["unit_id"])
    op.create_index("ix_maintenance_status", "maintenance_tickets", ["status"])
    op.create_index("ix_maintenance_assigned_to", "maintenance_tickets", ["assigned_to"])


def downgrade() -> None:
    op.drop_table("maintenance_tickets")
    op.drop_table("cleaning_tasks")
    op.drop_table("expense_records")
    op.drop_table("revenue_records")
    op.drop_table("bookings")
    op.drop_table("customers")
    op.drop_table("units")
    op.drop_table("users")

    for enum_name in [
        "ticket_status", "ticket_priority", "task_status",
        "finance_category", "booking_channel", "payment_status",
        "booking_status", "unit_status", "user_role",
    ]:
        op.execute(f"DROP TYPE IF EXISTS {enum_name}")
