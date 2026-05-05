from fastapi import APIRouter, Body, Depends, HTTPException, Request, Response, status
from app.domain.schemas.user import (
    AccessTokenResponse,
    LoginRequest,
    RefreshTokenRequest,
    TokenResponse,
)
from app.services.auth_service import AuthService, UserService
from app.core.dependencies import DBSession, CurrentUserPayload
from app.domain.schemas.user import UserResponse
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        path="/",
        samesite=settings.COOKIE_SAMESITE,
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, response: Response, db: DBSession):
    service = AuthService(db)
    token_response, refresh_token = await service.login(data)
    _set_refresh_cookie(response, refresh_token)
    return token_response


@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh_token(
    request: Request,
    response: Response,
    db: DBSession,
    data: RefreshTokenRequest | None = Body(default=None),
):
    service = AuthService(db)
    refresh_token_value = data.refresh_token if data else None
    refresh_token_value = refresh_token_value or request.cookies.get(
        settings.REFRESH_COOKIE_NAME
    )

    try:
        token_response, rotated_refresh_token = await service.refresh(refresh_token_value)
    except HTTPException as exc:
        if exc.status_code == status.HTTP_401_UNAUTHORIZED:
            _clear_refresh_cookie(response)
        raise

    _set_refresh_cookie(response, rotated_refresh_token)
    return token_response


@router.post("/logout")
async def logout(response: Response):
    _clear_refresh_cookie(response)
    return {"message": "Logged out"}


@router.get("/me", response_model=UserResponse)
async def get_current_user(payload: CurrentUserPayload, db: DBSession):
    from uuid import UUID
    service = AuthService(db)
    user_service = UserService(db)
    return await user_service.get_user(UUID(payload["sub"]))
