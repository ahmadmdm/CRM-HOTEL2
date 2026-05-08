from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Query

from app.core.dependencies import AdminOrOperations, CurrentUserPayload, DBSession
from app.domain.models.location import LocationKind
from app.domain.schemas.common import PaginatedResponse
from app.domain.schemas.location import LocationCreate, LocationResponse, LocationUpdate
from app.services.classification_service import ClassificationService

router = APIRouter(prefix="/locations", tags=["Locations"])


@router.post("", response_model=LocationResponse, dependencies=[AdminOrOperations])
async def create_location(data: LocationCreate, db: DBSession):
    service = ClassificationService(db)
    return await service.create_location(data)


@router.get("", response_model=PaginatedResponse[LocationResponse])
async def list_locations(
    db: DBSession,
    _: CurrentUserPayload,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    kind: Optional[LocationKind] = Query(None),
    parent_id: Optional[UUID] = Query(None),
):
    service = ClassificationService(db)
    items, total = await service.list_locations(
        skip=(page - 1) * page_size,
        limit=page_size,
        kind=kind,
        parent_id=parent_id,
    )
    return PaginatedResponse.create(
        items=[LocationResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.patch("/{location_id}", response_model=LocationResponse, dependencies=[AdminOrOperations])
async def update_location(location_id: UUID, data: LocationUpdate, db: DBSession):
    service = ClassificationService(db)
    return await service.update_location(location_id, data)