import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, field_validator, model_validator

from app.domain.models.accounting import AccountType, JournalSource, JournalStatus


class AccountCreate(BaseModel):
    code: str
    name: str
    account_type: AccountType
    parent_id: Optional[uuid.UUID] = None
    is_active: bool = True
    description: Optional[str] = None

    @field_validator("code")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        return value.strip().upper()


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    account_type: Optional[AccountType] = None
    parent_id: Optional[uuid.UUID] = None
    is_active: Optional[bool] = None
    description: Optional[str] = None


class AccountResponse(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    account_type: AccountType
    parent_id: Optional[uuid.UUID]
    is_active: bool
    description: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class JournalLineCreate(BaseModel):
    account_id: uuid.UUID
    description: Optional[str] = None
    debit: float = 0
    credit: float = 0
    unit_id: Optional[uuid.UUID] = None
    owner_id: Optional[uuid.UUID] = None
    management_entity_id: Optional[uuid.UUID] = None
    booking_id: Optional[uuid.UUID] = None
    invoice_id: Optional[uuid.UUID] = None

    @model_validator(mode="after")
    def validate_side(self) -> "JournalLineCreate":
        if self.debit < 0 or self.credit < 0:
            raise ValueError("Debit and credit must be positive or zero")
        if (self.debit == 0 and self.credit == 0) or (self.debit > 0 and self.credit > 0):
            raise ValueError("A journal line must have either debit or credit")
        return self


class JournalEntryCreate(BaseModel):
    entry_date: date
    description: str
    source: JournalSource = JournalSource.MANUAL
    source_id: Optional[uuid.UUID] = None
    status: JournalStatus = JournalStatus.POSTED
    lines: list[JournalLineCreate]


class JournalLineResponse(BaseModel):
    id: uuid.UUID
    entry_id: uuid.UUID
    account_id: uuid.UUID
    account: Optional[AccountResponse] = None
    description: Optional[str]
    debit: float
    credit: float
    unit_id: Optional[uuid.UUID]
    owner_id: Optional[uuid.UUID]
    management_entity_id: Optional[uuid.UUID]
    booking_id: Optional[uuid.UUID]
    invoice_id: Optional[uuid.UUID]
    created_at: datetime

    model_config = {"from_attributes": True}


class JournalEntryResponse(BaseModel):
    id: uuid.UUID
    entry_number: str
    entry_date: date
    description: str
    source: JournalSource
    source_id: Optional[uuid.UUID]
    status: JournalStatus
    created_by: Optional[uuid.UUID]
    posted_at: Optional[datetime]
    lines: list[JournalLineResponse]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TrialBalanceItem(BaseModel):
    account_id: uuid.UUID
    code: str
    name: str
    account_type: AccountType
    debit: float
    credit: float
    balance: float


class TrialBalanceResponse(BaseModel):
    period_start: date
    period_end: date
    total_debit: float
    total_credit: float
    is_balanced: bool
    items: list[TrialBalanceItem]