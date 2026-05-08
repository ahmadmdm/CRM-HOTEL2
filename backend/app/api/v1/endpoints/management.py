from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Query

from app.core.dependencies import AdminOrSubAdminOrFinancial, CurrentUserPayload, DBSession
from app.domain.schemas.common import PaginatedResponse
from app.domain.schemas.property_management import (
    ManagementEntityCreate,
    ManagementEntityResponse,
    ManagementEntityUpdate,
    OwnerCreate,
    OwnerResponse,
    OwnerUpdate,
    PropertyGroupCreate,
    PropertyGroupResponse,
    PropertyGroupUpdate,
    UnitManagementContractCreate,
    UnitManagementContractResponse,
    UnitManagementContractUpdate,
)
from app.services.classification_service import ClassificationService

router = APIRouter(prefix="/management", tags=["Management"])


@router.post("/owners", response_model=OwnerResponse, dependencies=[AdminOrSubAdminOrFinancial])
async def create_owner(data: OwnerCreate, db: DBSession):
    service = ClassificationService(db)
    return await service.create_owner(data)


@router.get("/owners", response_model=PaginatedResponse[OwnerResponse])
async def list_owners(
    db: DBSession,
    _: CurrentUserPayload,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    service = ClassificationService(db)
    items, total = await service.list_owners(skip=(page - 1) * page_size, limit=page_size)
    return PaginatedResponse.create(
        items=[OwnerResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.patch("/owners/{owner_id}", response_model=OwnerResponse, dependencies=[AdminOrSubAdminOrFinancial])
async def update_owner(owner_id: UUID, data: OwnerUpdate, db: DBSession):
    service = ClassificationService(db)
    return await service.update_owner(owner_id, data)


@router.post("/entities", response_model=ManagementEntityResponse, dependencies=[AdminOrSubAdminOrFinancial])
async def create_management_entity(data: ManagementEntityCreate, db: DBSession):
    service = ClassificationService(db)
    return await service.create_management_entity(data)


@router.get("/entities", response_model=PaginatedResponse[ManagementEntityResponse])
async def list_management_entities(
    db: DBSession,
    _: CurrentUserPayload,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    service = ClassificationService(db)
    items, total = await service.list_management_entities(skip=(page - 1) * page_size, limit=page_size)
    return PaginatedResponse.create(
        items=[ManagementEntityResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.patch("/entities/{entity_id}", response_model=ManagementEntityResponse, dependencies=[AdminOrSubAdminOrFinancial])
async def update_management_entity(entity_id: UUID, data: ManagementEntityUpdate, db: DBSession):
    service = ClassificationService(db)
    return await service.update_management_entity(entity_id, data)


@router.post("/property-groups", response_model=PropertyGroupResponse, dependencies=[AdminOrSubAdminOrFinancial])
async def create_property_group(data: PropertyGroupCreate, db: DBSession):
    service = ClassificationService(db)
    return await service.create_property_group(data)


@router.get("/property-groups", response_model=PaginatedResponse[PropertyGroupResponse])
async def list_property_groups(
    db: DBSession,
    _: CurrentUserPayload,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    service = ClassificationService(db)
    items, total = await service.list_property_groups(skip=(page - 1) * page_size, limit=page_size)
    return PaginatedResponse.create(
        items=[PropertyGroupResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.patch("/property-groups/{group_id}", response_model=PropertyGroupResponse, dependencies=[AdminOrSubAdminOrFinancial])
async def update_property_group(group_id: UUID, data: PropertyGroupUpdate, db: DBSession):
    service = ClassificationService(db)
    return await service.update_property_group(group_id, data)


@router.post("/contracts", response_model=UnitManagementContractResponse, dependencies=[AdminOrSubAdminOrFinancial])
async def create_contract(data: UnitManagementContractCreate, db: DBSession):
    service = ClassificationService(db)
    return await service.create_contract(data)


@router.get("/contracts", response_model=PaginatedResponse[UnitManagementContractResponse])
async def list_contracts(
    db: DBSession,
    _: CurrentUserPayload,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    unit_id: Optional[UUID] = Query(None),
):
    service = ClassificationService(db)
    items, total = await service.list_contracts(skip=(page - 1) * page_size, limit=page_size, unit_id=unit_id)
    return PaginatedResponse.create(
        items=[UnitManagementContractResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.patch("/contracts/{contract_id}", response_model=UnitManagementContractResponse, dependencies=[AdminOrSubAdminOrFinancial])
async def update_contract(contract_id: UUID, data: UnitManagementContractUpdate, db: DBSession):
    service = ClassificationService(db)
    return await service.update_contract(contract_id, data)