import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.domain.models.operation import TaskStatus, TicketPriority, TicketStatus
from app.domain.schemas.unit import UnitSummary


class CleaningTaskCreate(BaseModel):
    unit_id: uuid.UUID
    booking_id: Optional[uuid.UUID] = None
    assigned_to: Optional[uuid.UUID] = None
    notes: Optional[str] = None


class CleaningTaskUpdate(BaseModel):
    assigned_to: Optional[uuid.UUID] = None
    notes: Optional[str] = None


class CleaningTaskStatusUpdate(BaseModel):
    status: TaskStatus


class CleaningTaskResponse(BaseModel):
    id: uuid.UUID
    unit_id: uuid.UUID
    unit: Optional[UnitSummary] = None
    booking_id: Optional[uuid.UUID]
    assigned_to: Optional[uuid.UUID]
    status: TaskStatus
    notes: Optional[str]
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MaintenanceTicketCreate(BaseModel):
    unit_id: uuid.UUID
    title: str
    description: Optional[str] = None
    priority: TicketPriority = TicketPriority.MEDIUM
    assigned_to: Optional[uuid.UUID] = None


class MaintenanceTicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[TicketPriority] = None
    assigned_to: Optional[uuid.UUID] = None


class MaintenanceTicketStatusUpdate(BaseModel):
    status: TicketStatus
    resolution_notes: Optional[str] = None


class MaintenanceTicketResponse(BaseModel):
    id: uuid.UUID
    unit_id: uuid.UUID
    unit: Optional[UnitSummary] = None
    created_by: Optional[uuid.UUID]
    assigned_to: Optional[uuid.UUID]
    title: str
    description: Optional[str]
    priority: TicketPriority
    status: TicketStatus
    images: Optional[list]
    resolved_at: Optional[datetime]
    resolution_notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
