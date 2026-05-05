from typing import Optional
from uuid import UUID
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.operation_repository import OperationRepository
from app.repositories.unit_repository import UnitRepository
from app.domain.models.operation import (
    CleaningTask, MaintenanceTicket, TaskStatus, TicketStatus, TicketPriority
)
from app.domain.models.unit import UnitStatus
from app.domain.schemas.operation import (
    CleaningTaskCreate, CleaningTaskUpdate, CleaningTaskStatusUpdate,
    MaintenanceTicketCreate, MaintenanceTicketUpdate, MaintenanceTicketStatusUpdate,
)


class OperationService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = OperationRepository(session)
        self.unit_repo = UnitRepository(session)

    # ── Cleaning Tasks ─────────────────────────────────────────────
    async def create_cleaning_task(self, data: CleaningTaskCreate) -> CleaningTask:
        task = CleaningTask(**data.model_dump())
        created = await self.repo.create(task)
        await self.repo.commit()
        refreshed = await self._get_task(created.id)
        return refreshed

    async def update_cleaning_task_status(
        self, task_id: UUID, data: CleaningTaskStatusUpdate
    ) -> CleaningTask:
        task = await self._get_task(task_id)
        task.status = data.status
        if data.status == TaskStatus.DONE:
            task.completed_at = datetime.now(timezone.utc)
            # Auto-transition unit → READY
            unit = await self.unit_repo.get_by_id(task.unit_id)
            if unit and unit.status == UnitStatus.WAITING_CLEANING:
                unit.status = UnitStatus.READY
        await self.repo.commit()
        refreshed = await self._get_task(task.id)
        return refreshed

    async def list_cleaning_tasks(self, skip: int = 0, limit: int = 20, filters=None):
        return await self.repo.get_all(skip=skip, limit=limit, filters=filters)

    async def get_my_cleaning_tasks(self, user_id: UUID):
        return await self.repo.get_cleaning_tasks_by_assignee(user_id)

    # ── Maintenance Tickets ─────────────────────────────────────────
    async def create_maintenance_ticket(
        self, data: MaintenanceTicketCreate, created_by: UUID
    ) -> MaintenanceTicket:
        ticket = MaintenanceTicket(**data.model_dump(), created_by=created_by)
        created = await self.repo.create_ticket(ticket)
        # If urgent, flag unit for maintenance
        if data.priority == TicketPriority.URGENT:
            unit = await self.unit_repo.get_by_id(data.unit_id)
            if unit and unit.can_transition_to(UnitStatus.MAINTENANCE):
                unit.status = UnitStatus.MAINTENANCE
        await self.repo.commit()
        refreshed = await self.repo.get_ticket_by_id(created.id)
        if refreshed is None:
            raise HTTPException(status_code=404, detail="Maintenance ticket not found")
        return refreshed

    async def update_ticket_status(
        self, ticket_id: UUID, data: MaintenanceTicketStatusUpdate
    ) -> MaintenanceTicket:
        ticket = await self.repo.get_ticket_by_id(ticket_id)
        if not ticket:
            raise HTTPException(status_code=404, detail="Maintenance ticket not found")
        ticket.status = data.status
        ticket.resolution_notes = data.resolution_notes
        if data.status == TicketStatus.RESOLVED:
            ticket.resolved_at = datetime.now(timezone.utc)
            # Auto-transition unit → VACANT if it was under maintenance
            unit = await self.unit_repo.get_by_id(ticket.unit_id)
            if unit and unit.status == UnitStatus.MAINTENANCE:
                unit.status = UnitStatus.VACANT
        await self.repo.commit()
        refreshed = await self.repo.get_ticket_by_id(ticket.id)
        if refreshed is None:
            raise HTTPException(status_code=404, detail="Maintenance ticket not found")
        return refreshed

    async def list_maintenance_tickets(
        self, skip: int = 0, limit: int = 20, filters=None
    ):
        return await self.repo.get_maintenance_tickets(
            skip=skip, limit=limit, filters=filters
        )

    async def _get_task(self, task_id: UUID) -> CleaningTask:
        task = await self.repo.get_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Cleaning task not found")
        return task
