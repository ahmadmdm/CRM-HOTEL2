import { expect, test } from "@playwright/test";
import { expectRoute, login } from "./helpers";

test("admin can switch language and open the branded bulk assignment workflow", async ({ page }) => {
  await login(page, "admin@crm.local", "Admin@1234");
  await expectRoute(page, /\/$/, /لوحة القيادة \| نظام إدارة الوحدات/);

  await page.getByRole("button", { name: "English" }).click();
  await expect(page).toHaveTitle(/Dashboard \| Units Management System/);

  await page.goto("/units");
  await expectRoute(page, /\/units$/, /Units \| Units Management System/);
  await expect(page.getByRole("heading", { name: "Manage units and operational coverage from one screen." })).toBeVisible();

  await page.getByRole("button", { name: "Bulk Assignment" }).click();
  await expect(page.getByRole("heading", { name: "Bulk Assignment for Selected Units" })).toBeVisible();

  await page.getByRole("button", { name: "Clear Coverage" }).first().click();
  await expect(page.locator("main")).toContainText(
    "The supervisor, housekeeping team, and maintenance team will be removed from all selected units."
  );
});