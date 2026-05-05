import { expect, test } from "@playwright/test";
import { expectRoute, login } from "./helpers";

test("housekeeping users land on the housekeeping workspace", async ({ page }) => {
  await login(page, "housekeeping@crm.local", "Demo@1234");
  await expectRoute(page, /\/housekeeping$/, /مهام التنظيف|Housekeeping Tasks/);
  await expect(page.getByRole("heading", { name: /مهام التنظيف|Housekeeping Tasks/ })).toBeVisible();
});

test("maintenance users land on the maintenance workspace", async ({ page }) => {
  await login(page, "maintenance@crm.local", "Demo@1234");
  await expectRoute(page, /\/maintenance$/, /تذاكر الصيانة|Maintenance Tickets/);
  await expect(page.getByRole("heading", { name: /تذاكر الصيانة|Maintenance Tickets/ })).toBeVisible();
});

test("financial users land on the finance workspace", async ({ page }) => {
  await login(page, "financial@crm.local", "Demo@1234");
  await expectRoute(page, /\/finance$/, /المالية|Finance/);
  await expect(page.locator("main")).toContainText(/إدارة المالية|Finance Management/);
});