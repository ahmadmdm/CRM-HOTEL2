import { expect, type APIRequestContext, type Page } from "@playwright/test";

type LoginResponse = {
  access_token: string;
};

type SmokeUserRole =
  | "super_admin"
  | "sub_admin"
  | "financial"
  | "operations"
  | "maintenance"
  | "housekeeping";

type SmokeUser = {
  id: string;
  email: string;
  full_name: string;
  role: SmokeUserRole;
  is_active: boolean;
};

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /تسجيل الدخول|Sign In/ }).click();
}

export async function expectRoute(page: Page, pathname: RegExp, title: RegExp) {
  await expect(page).toHaveURL(pathname);
  await expect(page).toHaveTitle(title);
}

export async function apiLogin(request: APIRequestContext, email: string, password: string) {
  const response = await request.post("/api/v1/auth/login", {
    data: { email, password },
  });

  expect(response.ok()).toBeTruthy();

  const payload = (await response.json()) as LoginResponse;
  expect(payload.access_token).toBeTruthy();
  return payload.access_token;
}

export async function createSmokeUser(
  request: APIRequestContext,
  accessToken: string,
  user: {
    email: string;
    password: string;
    full_name: string;
    role: SmokeUserRole;
    phone?: string;
  }
) {
  const response = await request.post("/api/v1/users", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    data: user,
  });

  expect(response.ok()).toBeTruthy();
  return (await response.json()) as SmokeUser;
}

export async function setSmokeUserActiveState(
  request: APIRequestContext,
  accessToken: string,
  userId: string,
  isActive: boolean
) {
  const response = await request.patch(`/api/v1/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    data: {
      is_active: isActive,
    },
  });

  expect(response.ok()).toBeTruthy();
}