import enum
import uuid
from typing import List
from sqlalchemy import Boolean, String, Numeric, Text, Enum as SAEnum, ForeignKey, Index, Table, Column
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base, TimestampMixin


class UnitStatus(str, enum.Enum):
    VACANT = "vacant"                   # شاغرة
    RESERVED = "reserved"               # محجوزة
    OCCUPIED = "occupied"               # مشغولة
    WAITING_CLEANING = "waiting_cleaning"  # بانتظار تنظيف
    READY = "ready"                     # جاهزة
    MAINTENANCE = "maintenance"         # تحت الصيانة


# Valid state transitions (State Machine)
UNIT_STATUS_TRANSITIONS: dict[UnitStatus, list[UnitStatus]] = {
    UnitStatus.VACANT: [UnitStatus.RESERVED, UnitStatus.MAINTENANCE],
    UnitStatus.READY: [UnitStatus.RESERVED, UnitStatus.MAINTENANCE],
    UnitStatus.RESERVED: [UnitStatus.OCCUPIED, UnitStatus.VACANT, UnitStatus.MAINTENANCE],
    UnitStatus.OCCUPIED: [UnitStatus.WAITING_CLEANING, UnitStatus.MAINTENANCE],
    UnitStatus.WAITING_CLEANING: [UnitStatus.READY, UnitStatus.MAINTENANCE],
    UnitStatus.MAINTENANCE: [UnitStatus.VACANT, UnitStatus.READY],
}


unit_housekeeping_assignments = Table(
    "unit_housekeeping_assignments",
    Base.metadata,
    Column(
        "unit_id",
        UUID(as_uuid=True),
        ForeignKey("units.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "user_id",
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


unit_maintenance_assignments = Table(
    "unit_maintenance_assignments",
    Base.metadata,
    Column(
        "unit_id",
        UUID(as_uuid=True),
        ForeignKey("units.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "user_id",
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Unit(Base, TimestampMixin):
    __tablename__ = "units"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    floor: Mapped[int | None] = mapped_column(nullable=True)
    area_sqm: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    price_per_night: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    price_per_month: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    location: Mapped[str | None] = mapped_column(String(500), nullable=True)
    location_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("locations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("owners.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    management_entity_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("management_entities.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    property_group_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("property_groups.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    is_managed_by_us: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    admin_fee_percent: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    amenities: Mapped[list | None] = mapped_column(JSONB, nullable=True, default=list)
    images: Mapped[list | None] = mapped_column(JSONB, nullable=True, default=list)
    smart_lock_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    supervisor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    status: Mapped[UnitStatus] = mapped_column(
        SAEnum(UnitStatus, name="unit_status", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=UnitStatus.VACANT,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    location_node: Mapped["Location | None"] = relationship(
        "Location", back_populates="units", lazy="selectin"
    )
    owner: Mapped["Owner | None"] = relationship("Owner", back_populates="units", lazy="selectin")
    management_entity: Mapped["ManagementEntity | None"] = relationship(
        "ManagementEntity", back_populates="units", lazy="selectin"
    )
    property_group: Mapped["PropertyGroup | None"] = relationship(
        "PropertyGroup", back_populates="units", lazy="selectin"
    )
    management_contracts: Mapped[list["UnitManagementContract"]] = relationship(
        "UnitManagementContract", back_populates="unit", lazy="select"
    )
    team_assignments: Mapped[list["UnitTeamAssignment"]] = relationship(
        "UnitTeamAssignment", back_populates="unit", cascade="all, delete-orphan", lazy="selectin"
    )
    bookings: Mapped[list] = relationship("Booking", back_populates="unit", lazy="select")
    supervisor: Mapped["User | None"] = relationship(
        "User",
        foreign_keys=[supervisor_id],
        back_populates="supervised_units",
        lazy="selectin",
    )
    housekeeping_team: Mapped[list["User"]] = relationship(
        "User",
        secondary=unit_housekeeping_assignments,
        back_populates="housekeeping_units",
        lazy="selectin",
    )
    maintenance_team: Mapped[list["User"]] = relationship(
        "User",
        secondary=unit_maintenance_assignments,
        back_populates="maintenance_units",
        lazy="selectin",
    )
    cleaning_tasks: Mapped[list] = relationship(
        "CleaningTask", back_populates="unit", lazy="select"
    )
    maintenance_tickets: Mapped[list] = relationship(
        "MaintenanceTicket", back_populates="unit", lazy="select"
    )
    revenue_records: Mapped[list] = relationship(
        "RevenueRecord", back_populates="unit", lazy="select"
    )
    expense_records: Mapped[list] = relationship(
        "ExpenseRecord", back_populates="unit", lazy="select"
    )
    invoices: Mapped[list["Invoice"]] = relationship(
        "Invoice", back_populates="unit", lazy="select"
    )

    __table_args__ = (
        Index("ix_units_status", "status"),
        Index("ix_units_code", "code"),
        Index("ix_units_is_managed_by_us", "is_managed_by_us"),
    )

    def can_transition_to(self, new_status: UnitStatus) -> bool:
        allowed = UNIT_STATUS_TRANSITIONS.get(self.status, [])
        return new_status in allowed

    def __repr__(self) -> str:
        return f"<Unit id={self.id} code={self.code} status={self.status}>"
