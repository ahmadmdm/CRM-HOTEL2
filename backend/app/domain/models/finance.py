import enum
import uuid
from datetime import date
from sqlalchemy import String, Numeric, Text, Date, ForeignKey, Enum as SAEnum, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base, TimestampMixin


class FinanceCategory(str, enum.Enum):
    # Revenue
    RENT = "rent"
    DEPOSIT = "deposit"
    LATE_FEE = "late_fee"
    SERVICE_FEE = "service_fee"
    OTHER_INCOME = "other_income"
    # Expense
    MAINTENANCE_COST = "maintenance_cost"
    CLEANING_COST = "cleaning_cost"
    UTILITIES = "utilities"
    SUPPLIES = "supplies"
    SALARY = "salary"
    TAX = "tax"
    OTHER_EXPENSE = "other_expense"


class RevenueRecord(Base, TimestampMixin):
    __tablename__ = "revenue_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    unit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("units.id", ondelete="RESTRICT"), nullable=False
    )
    booking_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    journal_entry_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("journal_entries.id", ondelete="SET NULL"), nullable=True, index=True
    )

    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    category: Mapped[FinanceCategory] = mapped_column(
        SAEnum(FinanceCategory, name="finance_category", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    record_date: Mapped[date] = mapped_column(Date, nullable=False)
    receipt_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Relationships
    unit: Mapped["Unit"] = relationship("Unit", back_populates="revenue_records")
    booking: Mapped["Booking"] = relationship("Booking", back_populates="revenue_records")
    journal_entry: Mapped["JournalEntry | None"] = relationship("JournalEntry", lazy="selectin")

    __table_args__ = (
        Index("ix_revenue_unit_id", "unit_id"),
        Index("ix_revenue_record_date", "record_date"),
        Index("ix_revenue_booking_id", "booking_id"),
    )


class ExpenseRecord(Base, TimestampMixin):
    __tablename__ = "expense_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    unit_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("units.id", ondelete="SET NULL"), nullable=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    journal_entry_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("journal_entries.id", ondelete="SET NULL"), nullable=True, index=True
    )

    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    category: Mapped[FinanceCategory] = mapped_column(
        SAEnum(FinanceCategory, name="finance_category", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    record_date: Mapped[date] = mapped_column(Date, nullable=False)
    receipt_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Relationships
    unit: Mapped["Unit"] = relationship("Unit", back_populates="expense_records")
    journal_entry: Mapped["JournalEntry | None"] = relationship("JournalEntry", lazy="selectin")

    __table_args__ = (
        Index("ix_expense_unit_id", "unit_id"),
        Index("ix_expense_record_date", "record_date"),
    )
