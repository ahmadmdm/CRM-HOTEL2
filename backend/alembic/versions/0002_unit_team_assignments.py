"""unit supervisor and team assignments

Revision ID: 0002_unit_team_assignments
Revises: 0001_initial
Create Date: 2026-05-04 10:40:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "0002_unit_team_assignments"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "units",
        sa.Column("supervisor_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_units_supervisor_id", "units", ["supervisor_id"])
    op.create_foreign_key(
        "fk_units_supervisor_id_users",
        "units",
        "users",
        ["supervisor_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_table(
        "unit_housekeeping_assignments",
        sa.Column("unit_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["unit_id"], ["units.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("unit_id", "user_id"),
    )
    op.create_index(
        "ix_unit_housekeeping_assignments_user_id",
        "unit_housekeeping_assignments",
        ["user_id"],
    )

    op.create_table(
        "unit_maintenance_assignments",
        sa.Column("unit_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["unit_id"], ["units.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("unit_id", "user_id"),
    )
    op.create_index(
        "ix_unit_maintenance_assignments_user_id",
        "unit_maintenance_assignments",
        ["user_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_unit_maintenance_assignments_user_id",
        table_name="unit_maintenance_assignments",
    )
    op.drop_table("unit_maintenance_assignments")

    op.drop_index(
        "ix_unit_housekeeping_assignments_user_id",
        table_name="unit_housekeeping_assignments",
    )
    op.drop_table("unit_housekeeping_assignments")

    op.drop_constraint("fk_units_supervisor_id_users", "units", type_="foreignkey")
    op.drop_index("ix_units_supervisor_id", table_name="units")
    op.drop_column("units", "supervisor_id")