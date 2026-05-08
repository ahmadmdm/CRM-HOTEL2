import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from app.domain.models.invoice import (
    InvoiceLineType,
    InvoicePaymentMethod,
    InvoiceRecipientType,
    InvoiceStatus,
)


class InvoiceLineResponse(BaseModel):
    id: uuid.UUID
    invoice_id: uuid.UUID
    line_type: InvoiceLineType
    description: str
    quantity: float
    unit_price: float
    tax_amount: float
    total_amount: float
    service_period_start: Optional[date]
    service_period_end: Optional[date]
    created_at: datetime

    model_config = {"from_attributes": True}


class InvoicePaymentCreate(BaseModel):
    payment_date: date
    amount: float
    method: InvoicePaymentMethod = InvoicePaymentMethod.CASH
    reference: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, value: float) -> float:
        if value <= 0:
            raise ValueError("Amount must be positive")
        return value


class InvoicePaymentResponse(BaseModel):
    id: uuid.UUID
    invoice_id: uuid.UUID
    journal_entry_id: Optional[uuid.UUID]
    payment_date: date
    amount: float
    method: InvoicePaymentMethod
    reference: Optional[str]
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class InvoiceResponse(BaseModel):
    id: uuid.UUID
    invoice_number: str
    recipient_type: InvoiceRecipientType
    status: InvoiceStatus
    customer_id: Optional[uuid.UUID]
    owner_id: Optional[uuid.UUID]
    booking_id: Optional[uuid.UUID]
    unit_id: Optional[uuid.UUID]
    journal_entry_id: Optional[uuid.UUID]
    issue_date: date
    due_date: Optional[date]
    period_start: Optional[date]
    period_end: Optional[date]
    subtotal: float
    tax_amount: float
    discount_amount: float
    total_amount: float
    amount_paid: float
    notes: Optional[str]
    lines: list[InvoiceLineResponse] = Field(default_factory=list)
    payments: list[InvoicePaymentResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class GenerateBookingInvoiceRequest(BaseModel):
    issue_date: Optional[date] = None
    due_date: Optional[date] = None


class OwnerStatementRequest(BaseModel):
    owner_id: uuid.UUID
    period_start: date
    period_end: date
    issue_date: Optional[date] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None

    @model_validator(mode="after")
    def validate_dates(self) -> "OwnerStatementRequest":
        if self.period_end < self.period_start:
            raise ValueError("period_end must be on or after period_start")
        return self