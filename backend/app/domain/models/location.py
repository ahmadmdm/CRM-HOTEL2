import enum
import uuid

from sqlalchemy import Enum as SAEnum, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base, TimestampMixin


class LocationKind(str, enum.Enum):
    SITE = "site"
    BUILDING = "building"
    FLOOR = "floor"
    WING = "wing"
    AREA = "area"


class Location(Base, TimestampMixin):
    __tablename__ = "locations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    kind: Mapped[LocationKind] = mapped_column(
        SAEnum(LocationKind, name="location_kind", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=LocationKind.SITE,
    )
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("locations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    parent: Mapped["Location | None"] = relationship(
        "Location", remote_side=[id], back_populates="children", lazy="selectin"
    )
    children: Mapped[list["Location"]] = relationship(
        "Location", back_populates="parent", lazy="selectin"
    )
    units: Mapped[list["Unit"]] = relationship(
        "Unit", back_populates="location_node", lazy="select"
    )
    property_groups: Mapped[list["PropertyGroup"]] = relationship(
        "PropertyGroup", back_populates="location", lazy="select"
    )

    __table_args__ = (
        Index("ix_locations_code", "code"),
        Index("ix_locations_kind", "kind"),
    )