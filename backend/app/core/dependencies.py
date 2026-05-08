from typing import Annotated, AsyncGenerator
from uuid import UUID
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import decode_token
from app.db.session import AsyncSessionLocal
from app.domain.models.user import User, UserRole

security = HTTPBearer()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


DBSession = Annotated[AsyncSession, Depends(get_db)]


async def _get_current_user_payload(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> dict:
    token = credentials.credentials
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = UUID(str(payload.get("sub")))
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User is inactive or no longer exists",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload["sub"] = str(user.id)
    payload["role"] = user.role.value
    payload["full_name"] = user.full_name
    return payload


CurrentUserPayload = Annotated[dict, Depends(_get_current_user_payload)]


def require_roles(*roles: UserRole):
    """Factory dependency that checks if current user has one of the allowed roles."""

    def _checker(payload: CurrentUserPayload) -> dict:
        user_role = payload.get("role")
        if user_role not in [r.value for r in roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions for this action",
            )
        return payload

    return Depends(_checker)


# Convenience role dependencies
AdminOnly = require_roles(UserRole.SUPER_ADMIN)
AdminOrSubAdmin = require_roles(UserRole.SUPER_ADMIN, UserRole.SUB_ADMIN)
AdminOrFinancial = require_roles(UserRole.SUPER_ADMIN, UserRole.FINANCIAL)
AdminOrSubAdminOrFinancial = require_roles(
    UserRole.SUPER_ADMIN, UserRole.SUB_ADMIN, UserRole.FINANCIAL
)
AdminOrOperations = require_roles(
    UserRole.SUPER_ADMIN, UserRole.SUB_ADMIN, UserRole.OPERATIONS
)
MaintenanceAccess = require_roles(
    UserRole.SUPER_ADMIN, UserRole.SUB_ADMIN, UserRole.MAINTENANCE
)
HousekeepingAccess = require_roles(
    UserRole.SUPER_ADMIN, UserRole.SUB_ADMIN, UserRole.HOUSEKEEPING
)
AdminOrOpsOrMaintenance = require_roles(
    UserRole.SUPER_ADMIN,
    UserRole.SUB_ADMIN,
    UserRole.OPERATIONS,
    UserRole.MAINTENANCE,
)
AdminOrOpsOrHousekeeping = require_roles(
    UserRole.SUPER_ADMIN,
    UserRole.SUB_ADMIN,
    UserRole.OPERATIONS,
    UserRole.HOUSEKEEPING,
)
