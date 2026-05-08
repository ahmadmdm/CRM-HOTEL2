import enum
import uuid

from sqlalchemy import Boolean, Enum as SAEnum, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base, TimestampMixin


class TeamType(str, enum.Enum):
    HOUSEKEEPING = "housekeeping"
    MAINTENANCE = "maintenance"


class Team(Base, TimestampMixin):
    __tablename__ = "teams"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    team_type: Mapped[TeamType] = mapped_column(
        SAEnum(TeamType, name="team_type", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
    )
    supervisor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    supervisor: Mapped["User | None"] = relationship("User", foreign_keys=[supervisor_id], lazy="selectin")
    members: Mapped[list["TeamMember"]] = relationship(
        "TeamMember", back_populates="team", cascade="all, delete-orphan", lazy="selectin"
    )
    unit_assignments: Mapped[list["UnitTeamAssignment"]] = relationship(
        "UnitTeamAssignment", back_populates="team", cascade="all, delete-orphan", lazy="selectin"
    )

    __table_args__ = (
        Index("ix_teams_code", "code"),
        Index("ix_teams_team_type", "team_type"),
        Index("ix_teams_is_active", "is_active"),
    )


class TeamMember(Base, TimestampMixin):
    __tablename__ = "team_members"

    team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )

    team: Mapped["Team"] = relationship("Team", back_populates="members", lazy="selectin")
    user: Mapped["User"] = relationship("User", lazy="selectin")

    __table_args__ = (
        Index("ix_team_members_user_id", "user_id"),
    )


class UnitTeamAssignment(Base, TimestampMixin):
    __tablename__ = "unit_team_assignments"

    unit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("units.id", ondelete="CASCADE"), primary_key=True
    )
    team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), primary_key=True
    )
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    unit: Mapped["Unit"] = relationship("Unit", back_populates="team_assignments", lazy="selectin")
    team: Mapped["Team"] = relationship("Team", back_populates="unit_assignments", lazy="selectin")

    __table_args__ = (
        Index("ix_unit_team_assignments_team_id", "team_id"),
    )