from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Query, UploadFile, File, Depends
from app.domain.schemas.unit import (
    UnitCreate, UnitUpdate, UnitResponse, UnitSummary, UnitStatusUpdate
)
from app.domain.schemas.common import PaginatedResponse
from app.domain.models.unit import UnitStatus
from app.services.unit_service import UnitService
from app.core.dependencies import (
    DBSession, CurrentUserPayload, AdminOnly, AdminOrOperations, AdminOrSubAdmin
)

router = APIRouter(prefix="/units", tags=["Units"])


@router.post("", response_model=UnitResponse, dependencies=[AdminOnly])
async def create_unit(data: UnitCreate, db: DBSession):
    service = UnitService(db)
    return await service.create_unit(data)


@router.get("", response_model=PaginatedResponse[UnitSummary])
async def list_units(
    db: DBSession,
    _: CurrentUserPayload,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[UnitStatus] = Query(None),
):
    service = UnitService(db)
    skip = (page - 1) * page_size
    items, total = await service.list_units(
        skip=skip, limit=page_size, status_filter=status
    )
    return PaginatedResponse.create(
        items=[UnitSummary.model_validate(u) for u in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/status-summary")
async def get_status_summary(db: DBSession, _: CurrentUserPayload):
    service = UnitService(db)
    return await service.get_status_summary()


@router.get("/{unit_id}", response_model=UnitResponse)
async def get_unit(unit_id: UUID, db: DBSession, _: CurrentUserPayload):
    service = UnitService(db)
    return await service.get_unit(unit_id)


@router.patch("/{unit_id}", response_model=UnitResponse, dependencies=[AdminOrSubAdmin])
async def update_unit(unit_id: UUID, data: UnitUpdate, db: DBSession):
    service = UnitService(db)
    return await service.update_unit(unit_id, data)


@router.patch("/{unit_id}/status", response_model=UnitResponse, dependencies=[AdminOrOperations])
async def change_unit_status(
    unit_id: UUID,
    data: UnitStatusUpdate,
    db: DBSession,
    _: CurrentUserPayload,
):
    service = UnitService(db)
    return await service.change_unit_status(unit_id, data.status, data.reason)


@router.post("/{unit_id}/images", response_model=UnitResponse, dependencies=[AdminOrSubAdmin])
async def upload_unit_image(
    unit_id: UUID,
    db: DBSession,
    file: UploadFile = File(...),
):
    service = UnitService(db)
    return await service.upload_unit_image(unit_id, file)


@router.delete("/{unit_id}", dependencies=[AdminOnly])
async def delete_unit(unit_id: UUID, db: DBSession):
    service = UnitService(db)
    await service.delete_unit(unit_id)
    return {"message": "Unit deleted successfully"}
