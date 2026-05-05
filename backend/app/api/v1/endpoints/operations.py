from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Query
from app.domain.schemas.operation import (
    CleaningTaskCreate, CleaningTaskUpdate, CleaningTaskStatusUpdate, CleaningTaskResponse,
    MaintenanceTicketCreate, MaintenanceTicketUpdate,
    MaintenanceTicketStatusUpdate, MaintenanceTicketResponse,
)
from app.domain.schemas.common import PaginatedResponse
from app.domain.models.operation import TaskStatus, TicketStatus, TicketPriority
from app.services.operation_service import OperationService
from app.core.dependencies import (
    DBSession,
    CurrentUserPayload,
    HousekeepingAccess,
    MaintenanceAccess,
    AdminOrOperations,
    AdminOrOpsOrMaintenance,
    AdminOrOpsOrHousekeeping,
)

router = APIRouter(prefix="/operations", tags=["Operations"])

# ── Cleaning Tasks ────────────────────────────────────────────────────────────

@router.post("/cleaning", response_model=CleaningTaskResponse, dependencies=[AdminOrOperations])
async def create_cleaning_task(data: CleaningTaskCreate, db: DBSession):
    service = OperationService(db)
    return await service.create_cleaning_task(data)


@router.get("/cleaning", response_model=PaginatedResponse[CleaningTaskResponse], dependencies=[AdminOrOpsOrHousekeeping])
async def list_cleaning_tasks(
    db: DBSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[TaskStatus] = Query(None),
    unit_id: Optional[UUID] = Query(None),
):
    from app.domain.models.operation import CleaningTask
    service = OperationService(db)
    filters = []
    if status:
        filters.append(CleaningTask.status == status)
    if unit_id:
        filters.append(CleaningTask.unit_id == unit_id)
    items, total = await service.list_cleaning_tasks(
        skip=(page - 1) * page_size, limit=page_size, filters=filters
    )
    return PaginatedResponse.create(
        items=[CleaningTaskResponse.model_validate(t) for t in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/cleaning/my-tasks", response_model=list[CleaningTaskResponse], dependencies=[HousekeepingAccess])
async def get_my_cleaning_tasks(db: DBSession, payload: CurrentUserPayload):
    from uuid import UUID as PUUID
    service = OperationService(db)
    tasks = await service.get_my_cleaning_tasks(PUUID(payload["sub"]))
    return [CleaningTaskResponse.model_validate(t) for t in tasks]


@router.patch("/cleaning/{task_id}/status", response_model=CleaningTaskResponse, dependencies=[HousekeepingAccess])
async def update_cleaning_task_status(
    task_id: UUID, data: CleaningTaskStatusUpdate, db: DBSession, _: CurrentUserPayload
):
    service = OperationService(db)
    return await service.update_cleaning_task_status(task_id, data)


# ── Maintenance Tickets ────────────────────────────────────────────────────────

@router.post("/maintenance", response_model=MaintenanceTicketResponse, dependencies=[AdminOrOpsOrMaintenance])
async def create_maintenance_ticket(
    data: MaintenanceTicketCreate, db: DBSession, payload: CurrentUserPayload
):
    from uuid import UUID as PUUID
    service = OperationService(db)
    return await service.create_maintenance_ticket(data, PUUID(payload["sub"]))


@router.get("/maintenance", response_model=PaginatedResponse[MaintenanceTicketResponse], dependencies=[AdminOrOpsOrMaintenance])
async def list_maintenance_tickets(
    db: DBSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[TicketStatus] = Query(None),
    priority: Optional[TicketPriority] = Query(None),
    unit_id: Optional[UUID] = Query(None),
):
    from app.domain.models.operation import MaintenanceTicket
    service = OperationService(db)
    filters = []
    if status:
        filters.append(MaintenanceTicket.status == status)
    if priority:
        filters.append(MaintenanceTicket.priority == priority)
    if unit_id:
        filters.append(MaintenanceTicket.unit_id == unit_id)
    items, total = await service.list_maintenance_tickets(
        skip=(page - 1) * page_size, limit=page_size, filters=filters
    )
    return PaginatedResponse.create(
        items=[MaintenanceTicketResponse.model_validate(t) for t in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.patch("/maintenance/{ticket_id}/status", response_model=MaintenanceTicketResponse, dependencies=[MaintenanceAccess])
async def update_maintenance_status(
    ticket_id: UUID,
    data: MaintenanceTicketStatusUpdate,
    db: DBSession,
    _: CurrentUserPayload,
):
    service = OperationService(db)
    return await service.update_ticket_status(ticket_id, data)
