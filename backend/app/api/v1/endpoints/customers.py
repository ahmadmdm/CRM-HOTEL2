from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Query
from app.domain.schemas.customer import (
    CustomerCreate, CustomerUpdate, CustomerResponse, CustomerBlacklist
)
from app.domain.schemas.common import PaginatedResponse, MessageResponse
from app.services.customer_service import CustomerService
from app.core.dependencies import DBSession, CurrentUserPayload, AdminOrSubAdmin

router = APIRouter(prefix="/customers", tags=["Customers (CRM)"])


@router.post("", response_model=CustomerResponse)
async def create_customer(
    data: CustomerCreate, db: DBSession, _: CurrentUserPayload
):
    service = CustomerService(db)
    return await service.create_customer(data)


@router.get("", response_model=PaginatedResponse[CustomerResponse])
async def list_customers(
    db: DBSession,
    _: CurrentUserPayload,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_blacklisted: Optional[bool] = Query(None),
):
    service = CustomerService(db)
    items, total = await service.list_customers(
        skip=(page - 1) * page_size,
        limit=page_size,
        is_blacklisted=is_blacklisted,
    )
    return PaginatedResponse.create(
        items=[CustomerResponse.model_validate(c) for c in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: UUID, db: DBSession, _: CurrentUserPayload):
    service = CustomerService(db)
    return await service.get_customer(customer_id)


@router.patch(
    "/{customer_id}", response_model=CustomerResponse, dependencies=[AdminOrSubAdmin]
)
async def update_customer(customer_id: UUID, data: CustomerUpdate, db: DBSession):
    service = CustomerService(db)
    return await service.update_customer(customer_id, data)


@router.post(
    "/{customer_id}/blacklist",
    response_model=CustomerResponse,
    dependencies=[AdminOrSubAdmin],
)
async def blacklist_customer(
    customer_id: UUID, data: CustomerBlacklist, db: DBSession
):
    service = CustomerService(db)
    return await service.blacklist_customer(customer_id, data)


@router.delete(
    "/{customer_id}/blacklist",
    response_model=CustomerResponse,
    dependencies=[AdminOrSubAdmin],
)
async def remove_blacklist(customer_id: UUID, db: DBSession):
    service = CustomerService(db)
    return await service.remove_blacklist(customer_id)
