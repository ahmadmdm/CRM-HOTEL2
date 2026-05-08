import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator

from app.domain.models.location import LocationKind


class LocationCreate(BaseModel):
    name: str
    code: str
    kind: LocationKind = LocationKind.SITE
    parent_id: Optional[uuid.UUID] = None
    address: Optional[str] = None
    city: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("code")
    @classmethod
    def code_uppercase(cls, value: str) -> str:
        return value.strip().upper()


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    kind: Optional[LocationKind] = None
    parent_id: Optional[uuid.UUID] = None
    address: Optional[str] = None
    city: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("code")
    @classmethod
    def code_uppercase(cls, value: str | None) -> str | None:
        return value.strip().upper() if value else value


class LocationResponse(BaseModel):
    id: uuid.UUID
    name: str
    code: str
    kind: LocationKind
    parent_id: Optional[uuid.UUID]
    address: Optional[str]
    city: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}