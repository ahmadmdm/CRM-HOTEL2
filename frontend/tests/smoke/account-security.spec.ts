import { expect, test } from "@playwright/test";
import {
  apiLogin,
  createSmokeUser,
  expectRoute,
  login,
  setSmokeUserActiveState,
} from "./helpers";

const ACCOUNT_EMAIL = process.env.PLAYWRIGHT_ACCOUNT_EMAIL ?? "admin@crm.local";
const ACCOUNT_PASSWORD = process.env.PLAYWRIGHT_ACCOUNT_PASSWORD ?? "Admin@1234";
const ADMIN_EMAIL = process.env.PLAYWRIGHT_ADMIN_EMAIL ?? ACCOUNT_EMAIL;
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? ACCOUNT_PASSWORD;
const SMOKE_EMAIL_DOMAIN = process.env.PLAYWRIGHT_SMOKE_EMAIL_DOMAIN ?? "crm.clo0.net";
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

test("account security page is available to authenticated users", async ({ page }) => {
  await login(page, ACCOUNT_EMAIL, ACCOUNT_PASSWORD);
  await expectRoute(page, /\/$/, /لوحة القيادة|Dashboard/);

  await page.goto("/account");
  await expectRoute(page, /\/account$/, /الحساب والأمان|Account & Security/);
  await expect(page.getByRole("heading", { name: /تحديث كلمة المرور|Update password/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /حفظ كلمة المرور الجديدة|Save new password/ })).toBeVisible();
  await expect(page.locator('input[autocomplete="current-password"]')).toBeVisible();
  await expect(page.locator('input[autocomplete="new-password"]')).toHaveCount(2);
});

test("authenticated users can change their password and must sign in again", async ({
  page,
  request,
}) => {
  const adminAccessToken = await apiLogin(request, ADMIN_EMAIL, ADMIN_PASSWORD);
  const suffix = `${Date.now()}`;
  const email = `smoke-password-${suffix}@${SMOKE_EMAIL_DOMAIN}`;
  const currentPassword = `SmokePass@${suffix}A`;
  const newPassword = `SmokePass@${suffix}B`;

  let userId: string | null = null;

  try {
    const user = await createSmokeUser(request, adminAccessToken, {
      email,
      password: currentPassword,
      full_name: "Smoke Password Flow",
      role: "operations",
    });
    userId = user.id;

    const userAccessToken = await apiLogin(request, email, currentPassword);
    await page.context().addCookies([
      {
        name: "crm_access_token",
        value: userAccessToken,
        url: BASE_URL,
        sameSite: "Lax",
      },
    ]);
    await page.goto("/account");
    await expectRoute(page, /\/account$/, /الحساب والأمان|Account & Security/);

    await page.locator('input[autocomplete="current-password"]').fill(currentPassword);
    await page.locator('input[autocomplete="new-password"]').nth(0).fill(newPassword);
    await page.locator('input[autocomplete="new-password"]').nth(1).fill(newPassword);
    await page.getByRole("button", { name: /حفظ كلمة المرور الجديدة|Save new password/ }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: /سجّل دخولك إلى النظام|Sign In/ })).toBeVisible();

    await expect(async () => {
      await apiLogin(request, email, newPassword);
    }).toPass();
  } finally {
    if (userId) {
      await setSmokeUserActiveState(request, adminAccessToken, userId, false);
    }
  }
});