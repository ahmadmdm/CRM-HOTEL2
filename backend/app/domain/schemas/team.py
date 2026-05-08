import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.domain.models.team import TeamType
from app.domain.schemas.references import UserReference


class TeamCreate(BaseModel):
    name: str
    code: str
    team_type: TeamType
    supervisor_id: Optional[uuid.UUID] = None
    member_ids: list[uuid.UUID] = Field(default_factory=list)
    is_active: bool = True
    notes: Optional[str] = None

    @field_validator("code")
    @classmethod
    def code_uppercase(cls, value: str) -> str:
        return value.strip().upper()


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    team_type: Optional[TeamType] = None
    supervisor_id: Optional[uuid.UUID] = None
    member_ids: Optional[list[uuid.UUID]] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None

    @field_validator("code")
    @classmethod
    def code_uppercase(cls, value: str | None) -> str | None:
        return value.strip().upper() if value else value


class UnitTeamAssignmentCreate(BaseModel):
    unit_id: uuid.UUID
    team_id: uuid.UUID
    is_primary: bool = True
    notes: Optional[str] = None


class UnitTeamAssignmentResponse(BaseModel):
    unit_id: uuid.UUID
    team_id: uuid.UUID
    is_primary: bool
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TeamMemberResponse(BaseModel):
    user_id: uuid.UUID
    user: UserReference
    created_at: datetime

    model_config = {"from_attributes": True}


class TeamResponse(BaseModel):
    id: uuid.UUID
    name: str
    code: str
    team_type: TeamType
    supervisor_id: Optional[uuid.UUID]
    supervisor: Optional[UserReference] = None
    members: list[TeamMemberResponse] = Field(default_factory=list)
    is_active: bool
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}