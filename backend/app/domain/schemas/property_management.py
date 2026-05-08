import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, field_validator, model_validator

from app.domain.models.property_management import ContractStatus, OwnerType


class OwnerCreate(BaseModel):
    name: str
    owner_type: OwnerType = OwnerType.INDIVIDUAL
    email: Optional[str] = None
    phone: Optional[str] = None
    national_id: Optional[str] = None
    tax_number: Optional[str] = None
    notes: Optional[str] = None


class OwnerUpdate(BaseModel):
    name: Optional[str] = None
    owner_type: Optional[OwnerType] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    national_id: Optional[str] = None
    tax_number: Optional[str] = None
    notes: Optional[str] = None


class OwnerResponse(BaseModel):
    id: uuid.UUID
    name: str
    owner_type: OwnerType
    email: Optional[str]
    phone: Optional[str]
    national_id: Optional[str]
    tax_number: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ManagementEntityCreate(BaseModel):
    name: str
    code: str
    manager_id: Optional[uuid.UUID] = None
    is_internal: bool = True
    notes: Optional[str] = None

    @field_validator("code")
    @classmethod
    def code_uppercase(cls, value: str) -> str:
        return value.strip().upper()


class ManagementEntityUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    manager_id: Optional[uuid.UUID] = None
    is_internal: Optional[bool] = None
    notes: Optional[str] = None

    @field_validator("code")
    @classmethod
    def code_uppercase(cls, value: str | None) -> str | None:
        return value.strip().upper() if value else value


class ManagementEntityResponse(BaseModel):
    id: uuid.UUID
    name: str
    code: str
    manager_id: Optional[uuid.UUID]
    is_internal: bool
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PropertyGroupCreate(BaseModel):
    name: str
    code: str
    owner_id: Optional[uuid.UUID] = None
    management_entity_id: Optional[uuid.UUID] = None
    location_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None

    @field_validator("code")
    @classmethod
    def code_uppercase(cls, value: str) -> str:
        return value.strip().upper()


class PropertyGroupUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    owner_id: Optional[uuid.UUID] = None
    management_entity_id: Optional[uuid.UUID] = None
    location_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None

    @field_validator("code")
    @classmethod
    def code_uppercase(cls, value: str | None) -> str | None:
        return value.strip().upper() if value else value


class PropertyGroupResponse(BaseModel):
    id: uuid.UUID
    name: str
    code: str
    owner_id: Optional[uuid.UUID]
    management_entity_id: Optional[uuid.UUID]
    location_id: Optional[uuid.UUID]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UnitManagementContractCreate(BaseModel):
    unit_id: uuid.UUID
    owner_id: Optional[uuid.UUID] = None
    management_entity_id: Optional[uuid.UUID] = None
    property_group_id: Optional[uuid.UUID] = None
    starts_on: date
    ends_on: Optional[date] = None
    admin_fee_percent: float = 0
    status: ContractStatus = ContractStatus.ACTIVE
    notes: Optional[str] = None

    @model_validator(mode="after")
    def validate_contract(self) -> "UnitManagementContractCreate":
        if self.ends_on and self.ends_on < self.starts_on:
            raise ValueError("Contract end date must be on or after the start date")
        if self.admin_fee_percent < 0 or self.admin_fee_percent > 100:
            raise ValueError("Admin fee percent must be between 0 and 100")
        return self


class UnitManagementContractUpdate(BaseModel):
    owner_id: Optional[uuid.UUID] = None
    management_entity_id: Optional[uuid.UUID] = None
    property_group_id: Optional[uuid.UUID] = None
    starts_on: Optional[date] = None
    ends_on: Optional[date] = None
    admin_fee_percent: Optional[float] = None
    status: Optional[ContractStatus] = None
    notes: Optional[str] = None

    @model_validator(mode="after")
    def validate_contract(self) -> "UnitManagementContractUpdate":
        if self.starts_on and self.ends_on and self.ends_on < self.starts_on:
            raise ValueError("Contract end date must be on or after the start date")
        if self.admin_fee_percent is not None and not 0 <= self.admin_fee_percent <= 100:
            raise ValueError("Admin fee percent must be between 0 and 100")
        return self


class UnitManagementContractResponse(BaseModel):
    id: uuid.UUID
    unit_id: uuid.UUID
    owner_id: Optional[uuid.UUID]
    management_entity_id: Optional[uuid.UUID]
    property_group_id: Optional[uuid.UUID]
    starts_on: date
    ends_on: Optional[date]
    admin_fee_percent: float
    status: ContractStatus
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}