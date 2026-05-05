from typing import Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.customer_repository import CustomerRepository
from app.domain.models.customer import Customer
from app.domain.schemas.customer import CustomerCreate, CustomerUpdate, CustomerBlacklist


class CustomerService:
    def __init__(self, session: AsyncSession):
        self.repo = CustomerRepository(session)

    async def create_customer(self, data: CustomerCreate) -> Customer:
        # Check if phone already registered
        existing = await self.repo.get_by_phone(data.phone)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Phone number already registered",
            )
        customer = Customer(**data.model_dump())
        created = await self.repo.create(customer)
        await self.repo.commit()
        return await self.get_customer(created.id)

    async def get_customer(self, customer_id: UUID) -> Customer:
        customer = await self.repo.get_by_id(customer_id)
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        return customer

    async def update_customer(self, customer_id: UUID, data: CustomerUpdate) -> Customer:
        customer = await self.get_customer(customer_id)
        await self.repo.update(customer, data.model_dump(exclude_none=True))
        await self.repo.commit()
        return await self.get_customer(customer_id)

    async def blacklist_customer(
        self, customer_id: UUID, data: CustomerBlacklist
    ) -> Customer:
        customer = await self.get_customer(customer_id)
        customer.is_blacklisted = True
        customer.blacklist_reason = data.reason
        await self.repo.commit()
        return await self.get_customer(customer_id)

    async def remove_blacklist(self, customer_id: UUID) -> Customer:
        customer = await self.get_customer(customer_id)
        customer.is_blacklisted = False
        customer.blacklist_reason = None
        await self.repo.commit()
        return await self.get_customer(customer_id)

    async def list_customers(
        self,
        skip: int = 0,
        limit: int = 20,
        is_blacklisted: Optional[bool] = None,
    ):
        filters = []
        if is_blacklisted is not None:
            filters.append(Customer.is_blacklisted == is_blacklisted)
        return await self.repo.get_all(skip=skip, limit=limit, filters=filters)
