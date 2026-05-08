import enum
import uuid
from datetime import date, datetime
from sqlalchemy import String, Numeric, Text, Date, DateTime, ForeignKey, Enum as SAEnum, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base, TimestampMixin


class BookingStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CHECKED_IN = "checked_in"
    CHECKED_OUT = "checked_out"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class PaymentStatus(str, enum.Enum):
    UNPAID = "unpaid"
    PARTIAL = "partial"
    PAID = "paid"
    REFUNDED = "refunded"


class BookingChannel(str, enum.Enum):
    DIRECT = "direct"
    AIRBNB = "airbnb"
    BOOKING_COM = "booking_com"
    AGODA = "agoda"
    PHONE = "phone"
    WALK_IN = "walk_in"
    OTHER = "other"


class Booking(Base, TimestampMixin):
    __tablename__ = "bookings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    unit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("units.id", ondelete="RESTRICT"), nullable=False
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    check_in: Mapped[date] = mapped_column(Date, nullable=False)
    check_out: Mapped[date] = mapped_column(Date, nullable=False)
    actual_check_in: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    actual_check_out: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    total_cost: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    tax_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    deposit_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    amount_paid: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)

    status: Mapped[BookingStatus] = mapped_column(
        SAEnum(BookingStatus, name="booking_status", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=BookingStatus.PENDING,
    )
    payment_status: Mapped[PaymentStatus] = mapped_column(
        SAEnum(PaymentStatus, name="payment_status", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=PaymentStatus.UNPAID,
    )
    booking_channel: Mapped[BookingChannel] = mapped_column(
        SAEnum(BookingChannel, name="booking_channel", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=BookingChannel.DIRECT,
    )

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    guests_count: Mapped[int] = mapped_column(nullable=False, default=1)

    # Relationships
    unit: Mapped["Unit"] = relationship("Unit", back_populates="bookings")
    customer: Mapped["Customer"] = relationship("Customer", back_populates="bookings")
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])
    cleaning_tasks: Mapped[list] = relationship("CleaningTask", back_populates="booking")
    revenue_records: Mapped[list] = relationship("RevenueRecord", back_populates="booking")
    invoices: Mapped[list["Invoice"]] = relationship("Invoice", back_populates="booking", lazy="selectin")

    __table_args__ = (
        Index("ix_bookings_unit_id", "unit_id"),
        Index("ix_bookings_customer_id", "customer_id"),
        Index("ix_bookings_check_in", "check_in"),
        Index("ix_bookings_check_out", "check_out"),
        Index("ix_bookings_status", "status"),
        Index("ix_bookings_payment_status", "payment_status"),
    )

    def __repr__(self) -> str:
        return f"<Booking id={self.id} unit_id={self.unit_id} status={self.status}>"
