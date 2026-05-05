import { expect, type Page } from "@playwright/test";

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