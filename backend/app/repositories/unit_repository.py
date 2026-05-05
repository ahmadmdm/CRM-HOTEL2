from typing import Optional, List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.repositories.base import BaseRepository
from app.domain.models.unit import Unit, UnitStatus


class UnitRepository(BaseRepository[Unit]):
    def __init__(self, session: AsyncSession):
        super().__init__(Unit, session)

    def _base_query(self):
        return select(Unit).options(
            selectinload(Unit.supervisor),
            selectinload(Unit.housekeeping_team),
            selectinload(Unit.maintenance_team),
        )

    async def get_by_code(self, code: str) -> Optional[Unit]:
        result = await self.session.execute(
            self._base_query().where(Unit.code == code.upper())
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, id: UUID) -> Optional[Unit]:
        result = await self.session.execute(
            self._base_query().where(Unit.id == id)
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 20,
        filters: List = None,
    ) -> tuple[List[Unit], int]:
        from sqlalchemy import func

        query = self._base_query()
        count_query = select(func.count()).select_from(Unit)
        if filters:
            for condition in filters:
                query = query.where(condition)
                count_query = count_query.where(condition)
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()
        result = await self.session.execute(
            query.offset(skip).limit(limit).order_by(Unit.created_at.desc())
        )
        return result.scalars().all(), total

    async def get_by_status(self, status: UnitStatus) -> List[Unit]:
        result = await self.session.execute(
            self._base_query().where(Unit.status == status)
        )
        return result.scalars().all()

    async def count_by_status(self) -> dict:
        results = {}
        for status in UnitStatus:
            from sqlalchemy import func
            count_result = await self.session.execute(
                select(func.count()).select_from(Unit).where(Unit.status == status)
            )
            results[status.value] = count_result.scalar_one()
        return results
