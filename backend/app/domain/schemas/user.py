import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator
from app.domain.models.user import UserRole
from app.domain.schemas.references import UnitReference, UserReference


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole = UserRole.OPERATIONS
    phone: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None


class UserPasswordChange(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    phone: Optional[str]
    created_at: datetime
    supervised_units: list[UnitReference] = []
    housekeeping_units: list[UnitReference] = []
    maintenance_units: list[UnitReference] = []

    model_config = {"from_attributes": True}


class UserAssignmentCandidateResponse(UserReference):
    phone: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not normalized or "@" not in normalized:
            raise ValueError("A valid email is required")
        return normalized


class RefreshTokenRequest(BaseModel):
    refresh_token: Optional[str] = None
