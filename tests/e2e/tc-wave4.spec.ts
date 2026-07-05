/**
 * Wave 4 E2E test cases: TC-02, TC-03, TC-05, TC-11
 *
 * TC-02: Login / logout cycle
 * TC-03: Add a meal and verify it appears in the diary
 * TC-05: Edit a meal via bottom sheet
 * TC-11: Health check endpoint returns ok
 */
import { expect, test, type Page } from "@playwright/test";

/** Dismiss the onboarding tour if it appears (fires on first login). */
async function dismissTour(page: Page) {
  const skip = page.getByTestId("btn-onboarding-skip");
  try {
    await skip.waitFor({ state: "visible", timeout: 2000 });
    await skip.click();
    await skip.waitFor({ state: "hidden", timeout: 2000 });
  } catch {
    // Tour not visible — that's fine
  }
}

// Shared user registration helper
async function registerAndLogin(
  page: Parameters<typeof test>[1] extends (args: { page: infer P }) => any ? P : never,
  suffix: string,
) {
  const username = `tc_user_${suffix}`;
  const email = `${username}@example.com`;
  const password = "password123";

  await page.goto("/");
  await page.getByTestId("tab-register").click();
  await page.getByTestId("input-reg-username").fill(username);
  await page.getByTestId("input-reg-displayname").fill("TC User");
  await page.getByTestId("input-reg-email").fill(email);
  await page.getByTestId("input-reg-password").fill(password);
  await page.getByTestId("input-reg-password2").fill(password);
  await page.getByTestId("input-reg-pdconsent").click();
  await page.getByTestId("btn-register").click();
  await expect(page.getByTestId("btn-add-meal")).toBeVisible();
  await dismissTour(page);

  return { username, email, password };
}

// ── TC-02: Login / Logout ─────────────────────────────────────────────────────
test("TC-02: user can log out and log back in", async ({ page }) => {
  const { username, password } = await registerAndLogin(page, `tc02_${Date.now()}`);

  // Log out
  await page.getByTestId("btn-logout").click();
  await expect(page.getByTestId("btn-login")).toBeVisible();

  // Log back in
  await page.getByTestId("input-login-username").fill(username);
  await page.getByTestId("input-login-password").fill(password);
  await page.getByTestId("btn-login").click();
  await expect(page.getByTestId("btn-add-meal")).toBeVisible();
});

// ── TC-03: Add a meal ─────────────────────────────────────────────────────────
test("TC-03: user can add a meal and see it in the diary", async ({ page }) => {
  await registerAndLogin(page, `tc03_${Date.now()}`);

  await page.getByTestId("btn-add-meal").click();
  await page.getByTestId("input-food-text").fill("Рис с овощами");
  await page.getByTestId("btn-save-meal").click();

  await expect(page.getByText("Рис с овощами")).toBeVisible();
});

// ── TC-05: Edit a meal via bottom sheet ───────────────────────────────────────
test("TC-05: user can edit a meal and see updated text", async ({ page }) => {
  await registerAndLogin(page, `tc05_${Date.now()}`);

  // Add a meal first
  await page.getByTestId("btn-add-meal").click();
  await page.getByTestId("input-food-text").fill("Суп с лапшой");
  await page.getByTestId("btn-save-meal").click();
  await expect(page.getByText("Суп с лапшой")).toBeVisible();

  // Click edit on the first meal
  await page.locator('[data-testid^="btn-edit-meal-"]').first().click();
  await expect(page.getByTestId("input-food-text")).toBeVisible();

  // Update the food text
  await page.getByTestId("input-food-text").fill("Борщ со сметаной");
  await page.getByTestId("btn-save-meal").click();

  await expect(page.getByText("Борщ со сметаной")).toBeVisible();
  await expect(page.getByText("Суп с лапшой")).not.toBeVisible();
});

// ── TC-11: Health check ───────────────────────────────────────────────────────
test("TC-11: /api/health returns ok status for DB", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);

  const body = await response.json();
  // The DB check must be ok
  expect(body.checks?.db?.ok).toBe(true);
  // The overall status should be ok or degraded (but not a 5xx)
  expect(["ok", "degraded"]).toContain(body.status);
});
