import enum
import uuid
from datetime import datetime
from sqlalchemy import String, Text, ForeignKey, Enum as SAEnum, DateTime, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base, TimestampMixin


class TaskStatus(str, enum.Enum):
    PENDING = "pending"       # معلقة
    IN_PROGRESS = "in_progress"  # جاري
    DONE = "done"             # منتهية
    SKIPPED = "skipped"       # متخطاة


class TicketPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"  # عاجل


class TicketStatus(str, enum.Enum):
    OPEN = "open"             # مفتوح
    IN_PROGRESS = "in_progress"  # جاري
    RESOLVED = "resolved"     # منتهي
    CLOSED = "closed"


class CleaningTask(Base, TimestampMixin):
    __tablename__ = "cleaning_tasks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    unit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("units.id", ondelete="CASCADE"), nullable=False
    )
    booking_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True
    )
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    status: Mapped[TaskStatus] = mapped_column(
        SAEnum(TaskStatus, name="task_status", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=TaskStatus.PENDING,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    unit: Mapped["Unit"] = relationship("Unit", back_populates="cleaning_tasks")
    booking: Mapped["Booking"] = relationship("Booking", back_populates="cleaning_tasks")
    assignee: Mapped["User"] = relationship("User", foreign_keys=[assigned_to])

    __table_args__ = (
        Index("ix_cleaning_unit_id", "unit_id"),
        Index("ix_cleaning_status", "status"),
        Index("ix_cleaning_assigned_to", "assigned_to"),
    )


class MaintenanceTicket(Base, TimestampMixin):
    __tablename__ = "maintenance_tickets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    unit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("units.id", ondelete="CASCADE"), nullable=False
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[TicketPriority] = mapped_column(
        SAEnum(TicketPriority, name="ticket_priority", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=TicketPriority.MEDIUM,
    )
    status: Mapped[TicketStatus] = mapped_column(
        SAEnum(TicketStatus, name="ticket_status", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=TicketStatus.OPEN,
    )
    images: Mapped[list | None] = mapped_column(JSONB, nullable=True, default=list)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    unit: Mapped["Unit"] = relationship("Unit", back_populates="maintenance_tickets")
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])
    assignee: Mapped["User"] = relationship("User", foreign_keys=[assigned_to])

    __table_args__ = (
        Index("ix_maintenance_unit_id", "unit_id"),
        Index("ix_maintenance_status", "status"),
        Index("ix_maintenance_priority", "priority"),
        Index("ix_maintenance_assigned_to", "assigned_to"),
    )
