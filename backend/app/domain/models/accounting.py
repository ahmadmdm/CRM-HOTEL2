import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Enum as SAEnum, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base, TimestampMixin


class AccountType(str, enum.Enum):
    ASSET = "asset"
    LIABILITY = "liability"
    EQUITY = "equity"
    REVENUE = "revenue"
    EXPENSE = "expense"


class JournalSource(str, enum.Enum):
    MANUAL = "manual"
    REVENUE = "revenue"
    EXPENSE = "expense"
    INVOICE = "invoice"
    PAYMENT = "payment"
    OWNER_STATEMENT = "owner_statement"


class JournalStatus(str, enum.Enum):
    DRAFT = "draft"
    POSTED = "posted"
    VOID = "void"


class Account(Base, TimestampMixin):
    __tablename__ = "accounts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    account_type: Mapped[AccountType] = mapped_column(
        SAEnum(AccountType, name="account_type", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
    )
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True, index=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    parent: Mapped["Account | None"] = relationship(
        "Account", remote_side=[id], back_populates="children", lazy="selectin"
    )
    children: Mapped[list["Account"]] = relationship("Account", back_populates="parent", lazy="selectin")
    lines: Mapped[list["JournalLine"]] = relationship("JournalLine", back_populates="account", lazy="select")

    __table_args__ = (
        Index("ix_accounts_code", "code"),
        Index("ix_accounts_type", "account_type"),
        Index("ix_accounts_is_active", "is_active"),
    )


class JournalEntry(Base, TimestampMixin):
    __tablename__ = "journal_entries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    entry_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    entry_date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[JournalSource] = mapped_column(
        SAEnum(JournalSource, name="journal_source", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=JournalSource.MANUAL,
    )
    source_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    status: Mapped[JournalStatus] = mapped_column(
        SAEnum(JournalStatus, name="journal_status", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=JournalStatus.POSTED,
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    lines: Mapped[list["JournalLine"]] = relationship(
        "JournalLine", back_populates="entry", cascade="all, delete-orphan", lazy="selectin"
    )
    creator: Mapped["User | None"] = relationship("User", foreign_keys=[created_by], lazy="selectin")

    __table_args__ = (
        Index("ix_journal_entries_entry_number", "entry_number"),
        Index("ix_journal_entries_entry_date", "entry_date"),
        Index("ix_journal_entries_source", "source", "source_id"),
        Index("ix_journal_entries_status", "status"),
    )


class JournalLine(Base, TimestampMixin):
    __tablename__ = "journal_lines"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    entry_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("journal_entries.id", ondelete="CASCADE"), nullable=False, index=True
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    debit: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    credit: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    unit_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("units.id", ondelete="SET NULL"), nullable=True, index=True
    )
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("owners.id", ondelete="SET NULL"), nullable=True, index=True
    )
    management_entity_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("management_entities.id", ondelete="SET NULL"), nullable=True, index=True
    )
    booking_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True, index=True
    )
    invoice_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True, index=True
    )

    entry: Mapped["JournalEntry"] = relationship("JournalEntry", back_populates="lines", lazy="selectin")
    account: Mapped["Account"] = relationship("Account", back_populates="lines", lazy="selectin")

    __table_args__ = (
        Index("ix_journal_lines_dimensions", "unit_id", "owner_id", "management_entity_id"),
    )