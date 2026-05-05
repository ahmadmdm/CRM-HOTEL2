import uuid

from pydantic import BaseModel

from app.domain.models.unit import UnitStatus
from app.domain.models.user import UserRole


class UserReference(BaseModel):
    id: uuid.UUID
    full_name: str
    role: UserRole
    email: str | None = None

    model_config = {"from_attributes": True}


class UnitReference(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    status: UnitStatus

    model_config = {"from_attributes": True}