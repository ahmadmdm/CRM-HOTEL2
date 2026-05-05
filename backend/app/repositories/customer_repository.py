from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.repositories.base import BaseRepository
from app.domain.models.customer import Customer


class CustomerRepository(BaseRepository[Customer]):
    def __init__(self, session: AsyncSession):
        super().__init__(Customer, session)

    async def get_by_phone(self, phone: str) -> Optional[Customer]:
        result = await self.session.execute(
            select(Customer).where(Customer.phone == phone)
        )
        return result.scalar_one_or_none()

    async def get_by_national_id(self, national_id: str) -> Optional[Customer]:
        result = await self.session.execute(
            select(Customer).where(Customer.national_id == national_id)
        )
        return result.scalar_one_or_none()
