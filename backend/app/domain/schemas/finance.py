import uuid
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, field_validator
from app.domain.models.finance import FinanceCategory


class RevenueCreate(BaseModel):
    unit_id: uuid.UUID
    booking_id: Optional[uuid.UUID] = None
    amount: float
    category: FinanceCategory
    description: Optional[str] = None
    record_date: date

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Amount must be positive")
        return v


class RevenueUpdate(BaseModel):
    amount: Optional[float] = None
    category: Optional[FinanceCategory] = None
    description: Optional[str] = None
    record_date: Optional[date] = None


class RevenueResponse(BaseModel):
    id: uuid.UUID
    unit_id: uuid.UUID
    booking_id: Optional[uuid.UUID]
    journal_entry_id: Optional[uuid.UUID]
    amount: float
    category: FinanceCategory
    description: Optional[str]
    record_date: date
    receipt_path: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class ExpenseCreate(BaseModel):
    unit_id: Optional[uuid.UUID] = None
    amount: float
    category: FinanceCategory
    description: Optional[str] = None
    record_date: date

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Amount must be positive")
        return v


class ExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    category: Optional[FinanceCategory] = None
    description: Optional[str] = None
    record_date: Optional[date] = None


class ExpenseResponse(BaseModel):
    id: uuid.UUID
    unit_id: Optional[uuid.UUID]
    journal_entry_id: Optional[uuid.UUID]
    amount: float
    category: FinanceCategory
    description: Optional[str]
    record_date: date
    receipt_path: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class FinanceSummary(BaseModel):
    total_revenue: float
    total_expenses: float
    net_profit: float
    period_start: date
    period_end: date
