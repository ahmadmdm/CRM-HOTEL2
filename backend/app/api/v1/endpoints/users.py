from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Query, Depends
from app.domain.schemas.user import (
    UserAssignmentCandidateResponse,
    UserCreate,
    UserUpdate,
    UserResponse,
)
from app.domain.schemas.common import PaginatedResponse
from app.services.auth_service import UserService
from app.core.dependencies import AdminOnly, AdminOrSubAdmin, DBSession, CurrentUserPayload

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("", response_model=UserResponse, dependencies=[AdminOnly])
async def create_user(data: UserCreate, db: DBSession):
    service = UserService(db)
    return await service.create_user(data)


@router.get("", response_model=PaginatedResponse[UserResponse], dependencies=[AdminOnly])
async def list_users(
    db: DBSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    service = UserService(db)
    skip = (page - 1) * page_size
    items, total = await service.list_users(skip=skip, limit=page_size)
    return PaginatedResponse.create(
        items=[UserResponse.model_validate(u) for u in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/assignment-candidates",
    response_model=list[UserAssignmentCandidateResponse],
    dependencies=[AdminOrSubAdmin],
)
async def list_assignment_candidates(db: DBSession):
    service = UserService(db)
    users = await service.list_assignment_candidates()
    return [UserAssignmentCandidateResponse.model_validate(user) for user in users]


@router.get("/{user_id}", response_model=UserResponse, dependencies=[AdminOnly])
async def get_user(user_id: UUID, db: DBSession):
    service = UserService(db)
    return await service.get_user(user_id)


@router.patch("/{user_id}", response_model=UserResponse, dependencies=[AdminOnly])
async def update_user(user_id: UUID, data: UserUpdate, db: DBSession):
    service = UserService(db)
    return await service.update_user(user_id, data)
