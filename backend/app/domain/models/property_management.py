import enum
import uuid
from datetime import date

from sqlalchemy import Boolean, Date, Enum as SAEnum, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base, TimestampMixin


class OwnerType(str, enum.Enum):
    INDIVIDUAL = "individual"
    COMPANY = "company"


class ContractStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    ENDED = "ended"


class Owner(Base, TimestampMixin):
    __tablename__ = "owners"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_type: Mapped[OwnerType] = mapped_column(
        SAEnum(OwnerType, name="owner_type", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=OwnerType.INDIVIDUAL,
    )
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    national_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    tax_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    units: Mapped[list["Unit"]] = relationship("Unit", back_populates="owner", lazy="select")
    property_groups: Mapped[list["PropertyGroup"]] = relationship(
        "PropertyGroup", back_populates="owner", lazy="select"
    )
    contracts: Mapped[list["UnitManagementContract"]] = relationship(
        "UnitManagementContract", back_populates="owner", lazy="select"
    )
    invoices: Mapped[list["Invoice"]] = relationship("Invoice", back_populates="owner", lazy="select")

    __table_args__ = (
        Index("ix_owners_name", "name"),
        Index("ix_owners_phone", "phone"),
        Index("ix_owners_national_id", "national_id"),
    )


class ManagementEntity(Base, TimestampMixin):
    __tablename__ = "management_entities"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    manager_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    is_internal: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    manager: Mapped["User | None"] = relationship("User", foreign_keys=[manager_id], lazy="selectin")
    units: Mapped[list["Unit"]] = relationship(
        "Unit", back_populates="management_entity", lazy="select"
    )
    property_groups: Mapped[list["PropertyGroup"]] = relationship(
        "PropertyGroup", back_populates="management_entity", lazy="select"
    )
    contracts: Mapped[list["UnitManagementContract"]] = relationship(
        "UnitManagementContract", back_populates="management_entity", lazy="select"
    )

    __table_args__ = (
        Index("ix_management_entities_code", "code"),
        Index("ix_management_entities_is_internal", "is_internal"),
    )


class PropertyGroup(Base, TimestampMixin):
    __tablename__ = "property_groups"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("owners.id", ondelete="SET NULL"), nullable=True, index=True
    )
    management_entity_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("management_entities.id", ondelete="SET NULL"), nullable=True, index=True
    )
    location_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("locations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    owner: Mapped["Owner | None"] = relationship("Owner", back_populates="property_groups", lazy="selectin")
    management_entity: Mapped["ManagementEntity | None"] = relationship(
        "ManagementEntity", back_populates="property_groups", lazy="selectin"
    )
    location: Mapped["Location | None"] = relationship("Location", back_populates="property_groups", lazy="selectin")
    units: Mapped[list["Unit"]] = relationship("Unit", back_populates="property_group", lazy="select")
    contracts: Mapped[list["UnitManagementContract"]] = relationship(
        "UnitManagementContract", back_populates="property_group", lazy="select"
    )

    __table_args__ = (
        Index("ix_property_groups_code", "code"),
    )


class UnitManagementContract(Base, TimestampMixin):
    __tablename__ = "unit_management_contracts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    unit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("units.id", ondelete="CASCADE"), nullable=False, index=True
    )
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("owners.id", ondelete="SET NULL"), nullable=True, index=True
    )
    management_entity_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("management_entities.id", ondelete="SET NULL"), nullable=True, index=True
    )
    property_group_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("property_groups.id", ondelete="SET NULL"), nullable=True, index=True
    )
    starts_on: Mapped[date] = mapped_column(Date, nullable=False)
    ends_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    admin_fee_percent: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    status: Mapped[ContractStatus] = mapped_column(
        SAEnum(ContractStatus, name="contract_status", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=ContractStatus.ACTIVE,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    unit: Mapped["Unit"] = relationship("Unit", back_populates="management_contracts", lazy="selectin")
    owner: Mapped["Owner | None"] = relationship("Owner", back_populates="contracts", lazy="selectin")
    management_entity: Mapped["ManagementEntity | None"] = relationship(
        "ManagementEntity", back_populates="contracts", lazy="selectin"
    )
    property_group: Mapped["PropertyGroup | None"] = relationship(
        "PropertyGroup", back_populates="contracts", lazy="selectin"
    )

    __table_args__ = (
        Index("ix_unit_management_contracts_status", "status"),
        Index("ix_unit_management_contracts_dates", "starts_on", "ends_on"),
    )