import pytest
from httpx import AsyncClient
from app.domain.models.user import UserRole


@pytest.mark.asyncio
async def test_login_sets_refresh_cookie_and_hides_refresh_token(
    client: AsyncClient,
    create_user,
):
    user = await create_user(
        role=UserRole.SUPER_ADMIN,
        email="login-auth@test.com",
        full_name="Login Auth User",
    )

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": "RolePass123"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" not in data
    assert response.cookies.get("crm_refresh_token")


@pytest.mark.asyncio
async def test_refresh_uses_cookie_and_rotates_it(
    client: AsyncClient,
    create_user,
):
    user = await create_user(
        role=UserRole.OPERATIONS,
        email="refresh-auth@test.com",
        full_name="Refresh Auth User",
    )

    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": "RolePass123"},
    )
    first_cookie = login_response.cookies.get("crm_refresh_token")

    refresh_response = await client.post("/api/v1/auth/refresh")

    assert refresh_response.status_code == 200
    assert refresh_response.json()["access_token"]
    assert refresh_response.cookies.get("crm_refresh_token")
    assert refresh_response.cookies.get("crm_refresh_token") != first_cookie


@pytest.mark.asyncio
async def test_logout_clears_refresh_cookie(
    client: AsyncClient,
    create_user,
):
    user = await create_user(
        role=UserRole.FINANCIAL,
        email="logout-auth@test.com",
        full_name="Logout Auth User",
    )

    await client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": "RolePass123"},
    )

    response = await client.post("/api/v1/auth/logout")

    assert response.status_code == 200
    assert client.cookies.get("crm_refresh_token") is None
    assert "crm_refresh_token=" in response.headers.get("set-cookie", "")