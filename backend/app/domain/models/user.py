import enum
import uuid
from sqlalchemy import String, Boolean, Enum as SAEnum, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base, TimestampMixin


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    SUB_ADMIN = "sub_admin"
    FINANCIAL = "financial"
    OPERATIONS = "operations"
    MAINTENANCE = "maintenance"
    HOUSEKEEPING = "housekeeping"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="user_role", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=UserRole.OPERATIONS,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)

    supervised_units: Mapped[list["Unit"]] = relationship(
        "Unit",
        foreign_keys="Unit.supervisor_id",
        back_populates="supervisor",
        lazy="selectin",
    )
    housekeeping_units: Mapped[list["Unit"]] = relationship(
        "Unit",
        secondary="unit_housekeeping_assignments",
        back_populates="housekeeping_team",
        lazy="selectin",
    )
    maintenance_units: Mapped[list["Unit"]] = relationship(
        "Unit",
        secondary="unit_maintenance_assignments",
        back_populates="maintenance_team",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_users_role", "role"),
        Index("ix_users_is_active", "is_active"),
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role={self.role}>"
