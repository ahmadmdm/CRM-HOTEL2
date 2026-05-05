from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from app.repositories.base import BaseRepository
from app.domain.models.operation import (
    CleaningTask, MaintenanceTicket, TaskStatus, TicketStatus
)


class OperationRepository(BaseRepository[CleaningTask]):
    def __init__(self, session: AsyncSession):
        super().__init__(CleaningTask, session)

    async def get_by_id(self, id: UUID) -> Optional[CleaningTask]:
        result = await self.session.execute(
            select(CleaningTask)
            .options(selectinload(CleaningTask.unit))
            .where(CleaningTask.id == id)
        )
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 20, filters=None):
        from sqlalchemy import func

        query = select(CleaningTask).options(selectinload(CleaningTask.unit))
        count_query = select(func.count()).select_from(CleaningTask)
        if filters:
            for condition in filters:
                query = query.where(condition)
                count_query = count_query.where(condition)
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()
        result = await self.session.execute(
            query.offset(skip).limit(limit).order_by(CleaningTask.created_at.desc())
        )
        return result.scalars().all(), total

    async def get_pending_cleaning_for_unit(
        self, unit_id: UUID
    ) -> Optional[CleaningTask]:
        result = await self.session.execute(
            select(CleaningTask).where(
                and_(
                    CleaningTask.unit_id == unit_id,
                    CleaningTask.status == TaskStatus.PENDING,
                )
            )
        )
        return result.scalars().first()

    async def get_cleaning_tasks_by_assignee(
        self, user_id: UUID
    ) -> List[CleaningTask]:
        result = await self.session.execute(
            select(CleaningTask)
            .options(selectinload(CleaningTask.unit))
            .where(
                or_(
                    CleaningTask.assigned_to == user_id,
                    CleaningTask.assigned_to.is_(None),
                )
            )
            .order_by(CleaningTask.created_at.desc())
        )
        return result.scalars().all()

    async def get_maintenance_tickets(
        self, skip: int = 0, limit: int = 20, filters=None
    ):
        from sqlalchemy import func
        query = select(MaintenanceTicket).options(selectinload(MaintenanceTicket.unit))
        count_query = select(func.count()).select_from(MaintenanceTicket)
        if filters:
            for f in filters:
                query = query.where(f)
                count_query = count_query.where(f)
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()
        result = await self.session.execute(
            query.offset(skip)
            .limit(limit)
            .order_by(MaintenanceTicket.created_at.desc())
        )
        return result.scalars().all(), total

    async def get_ticket_by_id(
        self, ticket_id: UUID
    ) -> Optional[MaintenanceTicket]:
        result = await self.session.execute(
            select(MaintenanceTicket)
            .options(selectinload(MaintenanceTicket.unit))
            .where(MaintenanceTicket.id == ticket_id)
        )
        return result.scalar_one_or_none()

    async def create_ticket(self, obj: MaintenanceTicket) -> MaintenanceTicket:
        self.session.add(obj)
        await self.session.flush()
        await self.session.refresh(obj)
        return obj
