from typing import Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.user_repository import UserRepository
from app.domain.models.user import User, UserRole
from app.domain.schemas.user import (
    AccessTokenResponse,
    UserCreate,
    UserUpdate,
    LoginRequest,
    TokenResponse,
)
from app.core.security import (
    verify_password, get_password_hash,
    create_access_token, create_refresh_token, decode_token,
)


class AuthService:
    def __init__(self, session: AsyncSession):
        self.repo = UserRepository(session)

    async def login(self, data: LoginRequest) -> tuple[TokenResponse, str]:
        user = await self.repo.get_by_email(data.email.lower())
        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated",
            )
        access_token = create_access_token(
            subject=user.id, role=user.role.value, full_name=user.full_name
        )
        refresh_token = create_refresh_token(subject=user.id)
        from app.domain.schemas.user import UserResponse
        return (
            TokenResponse(
                access_token=access_token,
                user=UserResponse.model_validate(user),
            ),
            refresh_token,
        )

    async def refresh(self, refresh_token: str | None) -> tuple[AccessTokenResponse, str]:
        if not refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing refresh token",
            )
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )
        user_id = payload.get("sub")
        user = await self.repo.get_by_id(UUID(user_id))
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )
        access_token = create_access_token(
            subject=user.id, role=user.role.value, full_name=user.full_name
        )
        rotated_refresh_token = create_refresh_token(subject=user.id)
        return (
            AccessTokenResponse(access_token=access_token),
            rotated_refresh_token,
        )


class UserService:
    def __init__(self, session: AsyncSession):
        self.repo = UserRepository(session)

    async def create_user(self, data: UserCreate) -> User:
        existing = await self.repo.get_by_email(data.email.lower())
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )
        user = User(
            email=data.email.lower(),
            password_hash=get_password_hash(data.password),
            full_name=data.full_name,
            role=data.role,
            phone=data.phone,
        )
        created = await self.repo.create(user)
        await self.repo.commit()
        return await self.get_user(created.id)

    async def get_user(self, user_id: UUID) -> User:
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )
        return user

    async def update_user(self, user_id: UUID, data: UserUpdate) -> User:
        user = await self.get_user(user_id)
        updated = await self.repo.update(user, data.model_dump(exclude_none=True))
        await self.repo.commit()
        return await self.get_user(updated.id)

    async def list_users(self, skip: int = 0, limit: int = 20):
        return await self.repo.get_all(skip=skip, limit=limit)

    async def list_assignment_candidates(self):
        return await self.repo.list_assignment_candidates()
