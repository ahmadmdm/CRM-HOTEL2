from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.repositories.base import BaseRepository
from app.domain.models.user import User, UserRole


class UserRepository(BaseRepository[User]):
    def __init__(self, session: AsyncSession):
        super().__init__(User, session)

    def _base_query(self):
        return select(User).options(
            selectinload(User.supervised_units),
            selectinload(User.housekeeping_units),
            selectinload(User.maintenance_units),
        )

    async def get_by_id(self, id):
        result = await self.session.execute(
            self._base_query().where(User.id == id)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.session.execute(
            self._base_query().where(User.email == email.lower())
        )
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 20, filters=None):
        from sqlalchemy import func

        query = self._base_query()
        count_query = select(func.count()).select_from(User)
        if filters:
            for condition in filters:
                query = query.where(condition)
                count_query = count_query.where(condition)
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()
        result = await self.session.execute(
            query.offset(skip).limit(limit).order_by(User.created_at.desc())
        )
        return result.scalars().all(), total

    async def list_assignment_candidates(self) -> list[User]:
        eligible_roles = [
            UserRole.SUPER_ADMIN,
            UserRole.SUB_ADMIN,
            UserRole.OPERATIONS,
            UserRole.MAINTENANCE,
            UserRole.HOUSEKEEPING,
        ]
        result = await self.session.execute(
            self._base_query()
            .where(User.is_active.is_(True))
            .where(User.role.in_(eligible_roles))
            .order_by(User.full_name.asc())
        )
        return result.scalars().all()
