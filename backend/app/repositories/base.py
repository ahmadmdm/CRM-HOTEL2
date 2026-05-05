from typing import TypeVar, Generic, Type, Optional, List, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    def __init__(self, model: Type[ModelType], session: AsyncSession):
        self.model = model
        self.session = session

    async def get_by_id(self, id: UUID) -> Optional[ModelType]:
        result = await self.session.execute(
            select(self.model).where(self.model.id == id)
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 20,
        filters: List[Any] = None,
    ) -> tuple[List[ModelType], int]:
        query = select(self.model)
        count_query = select(func.count()).select_from(self.model)
        if filters:
            for f in filters:
                query = query.where(f)
                count_query = count_query.where(f)
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()
        result = await self.session.execute(
            query.offset(skip).limit(limit).order_by(self.model.created_at.desc())
        )
        return result.scalars().all(), total

    async def create(self, obj: ModelType) -> ModelType:
        self.session.add(obj)
        await self.session.flush()
        await self.session.refresh(obj)
        return obj

    async def update(self, obj: ModelType, data: dict) -> ModelType:
        for key, value in data.items():
            if value is not None:
                setattr(obj, key, value)
        await self.session.flush()
        await self.session.refresh(obj)
        return obj

    async def delete(self, obj: ModelType) -> None:
        await self.session.delete(obj)
        await self.session.flush()

    async def commit(self) -> None:
        await self.session.commit()
