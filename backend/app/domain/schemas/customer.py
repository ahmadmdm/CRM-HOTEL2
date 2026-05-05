import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class CustomerCreate(BaseModel):
    full_name: str
    email: Optional[EmailStr] = None
    phone: str
    national_id: Optional[str] = None
    nationality: Optional[str] = None
    notes: Optional[str] = None


class CustomerUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    national_id: Optional[str] = None
    nationality: Optional[str] = None
    notes: Optional[str] = None


class CustomerBlacklist(BaseModel):
    reason: str


class CustomerResponse(BaseModel):
    id: uuid.UUID
    full_name: str
    email: Optional[str]
    phone: str
    national_id: Optional[str]
    nationality: Optional[str]
    notes: Optional[str]
    is_blacklisted: bool
    blacklist_reason: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CustomerSummary(BaseModel):
    id: uuid.UUID
    full_name: str
    phone: str
    is_blacklisted: bool

    model_config = {"from_attributes": True}
