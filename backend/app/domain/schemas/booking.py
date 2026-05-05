import uuid
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, field_validator, model_validator
from app.domain.models.booking import BookingStatus, PaymentStatus, BookingChannel
from app.domain.schemas.customer import CustomerSummary
from app.domain.schemas.unit import UnitSummary


class BookingCreate(BaseModel):
    unit_id: uuid.UUID
    customer_id: uuid.UUID
    check_in: date
    check_out: date
    total_cost: float
    tax_amount: float = 0.0
    deposit_amount: float = 0.0
    booking_channel: BookingChannel = BookingChannel.DIRECT
    guests_count: int = 1
    notes: Optional[str] = None

    @model_validator(mode="after")
    def check_dates(self) -> "BookingCreate":
        if self.check_out <= self.check_in:
            raise ValueError("check_out must be after check_in")
        return self


class BookingUpdate(BaseModel):
    check_in: Optional[date] = None
    check_out: Optional[date] = None
    total_cost: Optional[float] = None
    tax_amount: Optional[float] = None
    deposit_amount: Optional[float] = None
    booking_channel: Optional[BookingChannel] = None
    guests_count: Optional[int] = None
    notes: Optional[str] = None


class BookingCheckIn(BaseModel):
    actual_check_in: Optional[datetime] = None
    notes: Optional[str] = None


class BookingCheckOut(BaseModel):
    actual_check_out: Optional[datetime] = None
    notes: Optional[str] = None


class BookingPaymentUpdate(BaseModel):
    amount_paid: float
    payment_status: PaymentStatus


class BookingResponse(BaseModel):
    id: uuid.UUID
    unit_id: uuid.UUID
    customer_id: uuid.UUID
    unit: Optional[UnitSummary] = None
    customer: Optional[CustomerSummary] = None
    check_in: date
    check_out: date
    actual_check_in: Optional[datetime]
    actual_check_out: Optional[datetime]
    total_cost: float
    tax_amount: float
    deposit_amount: float
    amount_paid: float
    status: BookingStatus
    payment_status: PaymentStatus
    booking_channel: BookingChannel
    guests_count: int
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BookingDetailResponse(BookingResponse):
    pass
