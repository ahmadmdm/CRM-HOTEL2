from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Query

from app.core.dependencies import AdminOrOperations, CurrentUserPayload, DBSession
from app.domain.models.team import TeamType
from app.domain.schemas.common import PaginatedResponse
from app.domain.schemas.team import (
    TeamCreate,
    TeamResponse,
    TeamUpdate,
    UnitTeamAssignmentCreate,
    UnitTeamAssignmentResponse,
)
from app.services.team_service import TeamService

router = APIRouter(prefix="/teams", tags=["Teams"])


@router.post("", response_model=TeamResponse, dependencies=[AdminOrOperations])
async def create_team(data: TeamCreate, db: DBSession):
    service = TeamService(db)
    return await service.create_team(data)


@router.get("", response_model=PaginatedResponse[TeamResponse])
async def list_teams(
    db: DBSession,
    _: CurrentUserPayload,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    team_type: Optional[TeamType] = Query(None),
):
    service = TeamService(db)
    items, total = await service.list_teams(
        skip=(page - 1) * page_size,
        limit=page_size,
        team_type=team_type,
    )
    return PaginatedResponse.create(
        items=[TeamResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.patch("/{team_id}", response_model=TeamResponse, dependencies=[AdminOrOperations])
async def update_team(team_id: UUID, data: TeamUpdate, db: DBSession):
    service = TeamService(db)
    return await service.update_team(team_id, data)


@router.post("/assignments", response_model=UnitTeamAssignmentResponse, dependencies=[AdminOrOperations])
async def assign_team_to_unit(data: UnitTeamAssignmentCreate, db: DBSession):
    service = TeamService(db)
    return await service.assign_team_to_unit(data)