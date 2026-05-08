import uuid
from sqlalchemy import String, Text, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base, TimestampMixin


class Customer(Base, TimestampMixin):
    __tablename__ = "customers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    phone: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    national_id: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    nationality: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_blacklisted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    blacklist_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    bookings: Mapped[list] = relationship("Booking", back_populates="customer", lazy="select")
    invoices: Mapped[list["Invoice"]] = relationship("Invoice", back_populates="customer", lazy="select")

    __table_args__ = (
        Index("ix_customers_full_name", "full_name"),
        Index("ix_customers_is_blacklisted", "is_blacklisted"),
    )

    def __repr__(self) -> str:
        return f"<Customer id={self.id} name={self.full_name}>"
