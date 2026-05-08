"""unit classification management and teams

Revision ID: 0003_unit_mgmt
Revises: 0002_unit_team_assignments
Create Date: 2026-05-07 12:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "0003_unit_mgmt"
down_revision: Union[str, None] = "0002_unit_team_assignments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    ]


def upgrade() -> None:
    location_kind = postgresql.ENUM(
        "site", "building", "floor", "wing", "area", name="location_kind", create_type=False
    )
    owner_type = postgresql.ENUM("individual", "company", name="owner_type", create_type=False)
    contract_status = postgresql.ENUM("active", "paused", "ended", name="contract_status", create_type=False)
    team_type = postgresql.ENUM("housekeeping", "maintenance", name="team_type", create_type=False)

    bind = op.get_bind()
    location_kind.create(bind, checkfirst=True)
    owner_type.create(bind, checkfirst=True)
    contract_status.create(bind, checkfirst=True)
    team_type.create(bind, checkfirst=True)

    op.create_table(
        "locations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("code", sa.String(50), nullable=False, unique=True),
        sa.Column("kind", location_kind, nullable=False),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(["parent_id"], ["locations.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_locations_code", "locations", ["code"])
    op.create_index("ix_locations_kind", "locations", ["kind"])
    op.create_index("ix_locations_parent_id", "locations", ["parent_id"])

    op.create_table(
        "owners",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("owner_type", owner_type, nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column("national_id", sa.String(50), nullable=True),
        sa.Column("tax_number", sa.String(50), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        *_timestamps(),
    )
    op.create_index("ix_owners_name", "owners", ["name"])
    op.create_index("ix_owners_phone", "owners", ["phone"])
    op.create_index("ix_owners_national_id", "owners", ["national_id"])

    op.create_table(
        "management_entities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("code", sa.String(50), nullable=False, unique=True),
        sa.Column("manager_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("is_internal", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("notes", sa.Text(), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(["manager_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_management_entities_code", "management_entities", ["code"])
    op.create_index("ix_management_entities_is_internal", "management_entities", ["is_internal"])
    op.create_index("ix_management_entities_manager_id", "management_entities", ["manager_id"])

    op.create_table(
        "property_groups",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("code", sa.String(50), nullable=False, unique=True),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("management_entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("location_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(["owner_id"], ["owners.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["management_entity_id"], ["management_entities.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["location_id"], ["locations.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_property_groups_code", "property_groups", ["code"])
    op.create_index("ix_property_groups_owner_id", "property_groups", ["owner_id"])
    op.create_index("ix_property_groups_management_entity_id", "property_groups", ["management_entity_id"])
    op.create_index("ix_property_groups_location_id", "property_groups", ["location_id"])

    op.add_column("units", sa.Column("location_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("units", sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("units", sa.Column("management_entity_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("units", sa.Column("property_group_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("units", sa.Column("is_managed_by_us", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("units", sa.Column("admin_fee_percent", sa.Numeric(5, 2), nullable=True))
    op.create_foreign_key("fk_units_location_id_locations", "units", "locations", ["location_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_units_owner_id_owners", "units", "owners", ["owner_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key(
        "fk_units_management_entity_id_management_entities",
        "units",
        "management_entities",
        ["management_entity_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_units_property_group_id_property_groups",
        "units",
        "property_groups",
        ["property_group_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_units_location_id", "units", ["location_id"])
    op.create_index("ix_units_owner_id", "units", ["owner_id"])
    op.create_index("ix_units_management_entity_id", "units", ["management_entity_id"])
    op.create_index("ix_units_property_group_id", "units", ["property_group_id"])
    op.create_index("ix_units_is_managed_by_us", "units", ["is_managed_by_us"])

    op.create_table(
        "unit_management_contracts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("unit_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("management_entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("property_group_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("starts_on", sa.Date(), nullable=False),
        sa.Column("ends_on", sa.Date(), nullable=True),
        sa.Column("admin_fee_percent", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("status", contract_status, nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(["unit_id"], ["units.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["owner_id"], ["owners.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["management_entity_id"], ["management_entities.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["property_group_id"], ["property_groups.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_unit_management_contracts_unit_id", "unit_management_contracts", ["unit_id"])
    op.create_index("ix_unit_management_contracts_owner_id", "unit_management_contracts", ["owner_id"])
    op.create_index("ix_unit_management_contracts_management_entity_id", "unit_management_contracts", ["management_entity_id"])
    op.create_index("ix_unit_management_contracts_property_group_id", "unit_management_contracts", ["property_group_id"])
    op.create_index("ix_unit_management_contracts_status", "unit_management_contracts", ["status"])
    op.create_index("ix_unit_management_contracts_dates", "unit_management_contracts", ["starts_on", "ends_on"])

    op.create_table(
        "teams",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("code", sa.String(50), nullable=False, unique=True),
        sa.Column("team_type", team_type, nullable=False),
        sa.Column("supervisor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("notes", sa.Text(), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(["supervisor_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_teams_code", "teams", ["code"])
    op.create_index("ix_teams_team_type", "teams", ["team_type"])
    op.create_index("ix_teams_is_active", "teams", ["is_active"])
    op.create_index("ix_teams_supervisor_id", "teams", ["supervisor_id"])

    op.create_table(
        "team_members",
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("team_id", "user_id"),
    )
    op.create_index("ix_team_members_user_id", "team_members", ["user_id"])

    op.create_table(
        "unit_team_assignments",
        sa.Column("unit_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("notes", sa.Text(), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(["unit_id"], ["units.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("unit_id", "team_id"),
    )
    op.create_index("ix_unit_team_assignments_team_id", "unit_team_assignments", ["team_id"])


def downgrade() -> None:
    op.drop_index("ix_unit_team_assignments_team_id", table_name="unit_team_assignments")
    op.drop_table("unit_team_assignments")

    op.drop_index("ix_team_members_user_id", table_name="team_members")
    op.drop_table("team_members")

    op.drop_index("ix_teams_supervisor_id", table_name="teams")
    op.drop_index("ix_teams_is_active", table_name="teams")
    op.drop_index("ix_teams_team_type", table_name="teams")
    op.drop_index("ix_teams_code", table_name="teams")
    op.drop_table("teams")

    op.drop_index("ix_unit_management_contracts_dates", table_name="unit_management_contracts")
    op.drop_index("ix_unit_management_contracts_status", table_name="unit_management_contracts")
    op.drop_index("ix_unit_management_contracts_property_group_id", table_name="unit_management_contracts")
    op.drop_index("ix_unit_management_contracts_management_entity_id", table_name="unit_management_contracts")
    op.drop_index("ix_unit_management_contracts_owner_id", table_name="unit_management_contracts")
    op.drop_index("ix_unit_management_contracts_unit_id", table_name="unit_management_contracts")
    op.drop_table("unit_management_contracts")

    op.drop_index("ix_units_is_managed_by_us", table_name="units")
    op.drop_index("ix_units_property_group_id", table_name="units")
    op.drop_index("ix_units_management_entity_id", table_name="units")
    op.drop_index("ix_units_owner_id", table_name="units")
    op.drop_index("ix_units_location_id", table_name="units")
    op.drop_constraint("fk_units_property_group_id_property_groups", "units", type_="foreignkey")
    op.drop_constraint("fk_units_management_entity_id_management_entities", "units", type_="foreignkey")
    op.drop_constraint("fk_units_owner_id_owners", "units", type_="foreignkey")
    op.drop_constraint("fk_units_location_id_locations", "units", type_="foreignkey")
    op.drop_column("units", "admin_fee_percent")
    op.drop_column("units", "is_managed_by_us")
    op.drop_column("units", "property_group_id")
    op.drop_column("units", "management_entity_id")
    op.drop_column("units", "owner_id")
    op.drop_column("units", "location_id")

    op.drop_index("ix_property_groups_location_id", table_name="property_groups")
    op.drop_index("ix_property_groups_management_entity_id", table_name="property_groups")
    op.drop_index("ix_property_groups_owner_id", table_name="property_groups")
    op.drop_index("ix_property_groups_code", table_name="property_groups")
    op.drop_table("property_groups")

    op.drop_index("ix_management_entities_manager_id", table_name="management_entities")
    op.drop_index("ix_management_entities_is_internal", table_name="management_entities")
    op.drop_index("ix_management_entities_code", table_name="management_entities")
    op.drop_table("management_entities")

    op.drop_index("ix_owners_national_id", table_name="owners")
    op.drop_index("ix_owners_phone", table_name="owners")
    op.drop_index("ix_owners_name", table_name="owners")
    op.drop_table("owners")

    op.drop_index("ix_locations_parent_id", table_name="locations")
    op.drop_index("ix_locations_kind", table_name="locations")
    op.drop_index("ix_locations_code", table_name="locations")
    op.drop_table("locations")

    bind = op.get_bind()
    postgresql.ENUM(name="team_type").drop(bind, checkfirst=True)
    postgresql.ENUM(name="contract_status").drop(bind, checkfirst=True)
    postgresql.ENUM(name="owner_type").drop(bind, checkfirst=True)
    postgresql.ENUM(name="location_kind").drop(bind, checkfirst=True)