import uuid
from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field, field_validator, model_validator
from app.domain.models.unit import UnitStatus
from app.domain.schemas.references import UserReference


class UnitCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    floor: Optional[int] = None
    area_sqm: Optional[float] = None
    price_per_night: Optional[float] = None
    price_per_month: Optional[float] = None
    location: Optional[str] = None
    location_id: Optional[uuid.UUID] = None
    owner_id: Optional[uuid.UUID] = None
    management_entity_id: Optional[uuid.UUID] = None
    property_group_id: Optional[uuid.UUID] = None
    is_managed_by_us: bool = False
    admin_fee_percent: Optional[float] = None
    amenities: Optional[List[str]] = []
    smart_lock_code: Optional[str] = None
    notes: Optional[str] = None
    supervisor_id: Optional[uuid.UUID] = None
    housekeeping_team_ids: List[uuid.UUID] = Field(default_factory=list)
    maintenance_team_ids: List[uuid.UUID] = Field(default_factory=list)

    @field_validator("code")
    @classmethod
    def code_uppercase(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("admin_fee_percent")
    @classmethod
    def admin_fee_percent_range(cls, value: float | None) -> float | None:
        if value is not None and not 0 <= value <= 100:
            raise ValueError("Admin fee percent must be between 0 and 100")
        return value


class UnitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    floor: Optional[int] = None
    area_sqm: Optional[float] = None
    price_per_night: Optional[float] = None
    price_per_month: Optional[float] = None
    location: Optional[str] = None
    location_id: Optional[uuid.UUID] = None
    owner_id: Optional[uuid.UUID] = None
    management_entity_id: Optional[uuid.UUID] = None
    property_group_id: Optional[uuid.UUID] = None
    is_managed_by_us: Optional[bool] = None
    admin_fee_percent: Optional[float] = None
    amenities: Optional[List[str]] = None
    smart_lock_code: Optional[str] = None
    notes: Optional[str] = None
    supervisor_id: Optional[uuid.UUID] = None
    housekeeping_team_ids: Optional[List[uuid.UUID]] = None
    maintenance_team_ids: Optional[List[uuid.UUID]] = None

    @field_validator("admin_fee_percent")
    @classmethod
    def admin_fee_percent_range(cls, value: float | None) -> float | None:
        if value is not None and not 0 <= value <= 100:
            raise ValueError("Admin fee percent must be between 0 and 100")
        return value


class UnitStatusUpdate(BaseModel):
    status: UnitStatus
    reason: Optional[str] = None


class UnitResponse(BaseModel):
    id: uuid.UUID
    name: str
    code: str
    description: Optional[str]
    floor: Optional[int]
    area_sqm: Optional[float]
    price_per_night: Optional[float]
    base_price_per_night: Optional[float] = None  # alias for price_per_night
    price_per_month: Optional[float]
    location: Optional[str]
    location_id: Optional[uuid.UUID]
    owner_id: Optional[uuid.UUID]
    management_entity_id: Optional[uuid.UUID]
    property_group_id: Optional[uuid.UUID]
    is_managed_by_us: bool
    admin_fee_percent: Optional[float]
    amenities: Optional[List[Any]]
    images: Optional[List[str]]
    smart_lock_code: Optional[str]
    supervisor_id: Optional[uuid.UUID]
    supervisor: Optional[UserReference] = None
    housekeeping_team: List[UserReference] = Field(default_factory=list)
    maintenance_team: List[UserReference] = Field(default_factory=list)
    status: UnitStatus
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def set_base_price_alias(self) -> "UnitResponse":
        if self.base_price_per_night is None:
            self.base_price_per_night = self.price_per_night
        return self


class UnitSummary(BaseModel):
    id: uuid.UUID
    name: str
    code: str
    status: UnitStatus
    price_per_night: Optional[float]
    base_price_per_night: Optional[float] = None
    price_per_month: Optional[float]
    location: Optional[str]
    location_id: Optional[uuid.UUID]
    owner_id: Optional[uuid.UUID]
    management_entity_id: Optional[uuid.UUID]
    property_group_id: Optional[uuid.UUID]
    is_managed_by_us: bool
    admin_fee_percent: Optional[float]
    supervisor_id: Optional[uuid.UUID] = None
    supervisor: Optional[UserReference] = None
    housekeeping_team: List[UserReference] = Field(default_factory=list)
    maintenance_team: List[UserReference] = Field(default_factory=list)

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def set_base_price_alias(self) -> "UnitSummary":
        if self.base_price_per_night is None:
            self.base_price_per_night = self.price_per_night
        return self
