import os
import uuid
import pytest
import pytest_asyncio
from typing import AsyncGenerator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.db.session import Base
from app.core.dependencies import get_db
from app.core.security import get_password_hash, create_access_token
from app.domain.models.user import User, UserRole

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL") or os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://crm_user:crm_password@localhost:5432/crm_db",
).replace("/crm_db", "/crm_test_db")

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False, poolclass=NullPool)
TestSessionLocal = async_sessionmaker(
    bind=test_engine, class_=AsyncSession, expire_on_commit=False
)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        async with TestSessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="https://test"
    ) as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def admin_user() -> User:
    async with TestSessionLocal() as session:
        user = User(
            email=f"admin-{uuid.uuid4()}@test.com",
            password_hash=get_password_hash("AdminPass123"),
            full_name="Test Admin",
            role=UserRole.SUPER_ADMIN,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


@pytest.fixture
def admin_token(admin_user: User) -> str:
    return create_access_token(
        subject=admin_user.id,
        role=admin_user.role.value,
        full_name=admin_user.full_name,
    )


@pytest.fixture
def admin_headers(admin_token: str) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}


@pytest_asyncio.fixture
async def create_user():
    async def _create_user(
        role: UserRole,
        *,
        email: str | None = None,
        full_name: str | None = None,
        is_active: bool = True,
    ) -> User:
        async with TestSessionLocal() as session:
            resolved_email = email or f"{role.value}-{uuid.uuid4()}@test.com"
            existing = (
                await session.execute(select(User).where(User.email == resolved_email))
            ).scalar_one_or_none()

            if existing:
                existing.role = role
                existing.full_name = full_name or f"{role.value} user"
                existing.is_active = is_active
                await session.commit()
                await session.refresh(existing)
                return existing

            user = User(
                email=resolved_email,
                password_hash=get_password_hash("RolePass123"),
                full_name=full_name or f"{role.value} user",
                role=role,
                is_active=is_active,
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
            return user

    return _create_user


@pytest.fixture
def make_auth_headers():
    def _make(user: User) -> dict:
        token = create_access_token(
            subject=user.id,
            role=user.role.value,
            full_name=user.full_name,
        )
        return {"Authorization": f"Bearer {token}"}

    return _make


@pytest_asyncio.fixture
async def operations_user(create_user):
    return await create_user(UserRole.OPERATIONS, email="operations@test.com", full_name="Operations User")


@pytest_asyncio.fixture
async def financial_user(create_user):
    return await create_user(UserRole.FINANCIAL, email="financial@test.com", full_name="Financial User")


@pytest_asyncio.fixture
async def maintenance_user(create_user):
    return await create_user(UserRole.MAINTENANCE, email="maintenance@test.com", full_name="Maintenance User")


@pytest_asyncio.fixture
async def housekeeping_user(create_user):
    return await create_user(UserRole.HOUSEKEEPING, email="housekeeping@test.com", full_name="Housekeeping User")


@pytest_asyncio.fixture
async def inactive_financial_user(create_user):
    return await create_user(
        UserRole.FINANCIAL,
        email="inactive-financial@test.com",
        full_name="Inactive Financial User",
        is_active=False,
    )


@pytest.fixture
def operations_headers(operations_user: User, make_auth_headers) -> dict:
    return make_auth_headers(operations_user)


@pytest.fixture
def financial_headers(financial_user: User, make_auth_headers) -> dict:
    return make_auth_headers(financial_user)


@pytest.fixture
def maintenance_headers(maintenance_user: User, make_auth_headers) -> dict:
    return make_auth_headers(maintenance_user)


@pytest.fixture
def housekeeping_headers(housekeeping_user: User, make_auth_headers) -> dict:
    return make_auth_headers(housekeeping_user)


@pytest.fixture
def inactive_financial_headers(inactive_financial_user: User, make_auth_headers) -> dict:
    return make_auth_headers(inactive_financial_user)
