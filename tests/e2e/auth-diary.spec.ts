import { expect, test } from "@playwright/test";

test("user can register, add a meal, log out, and log back in", async ({ page }) => {
  const suffix = Date.now();
  const username = `e2e_user_${suffix}`;
  const email = `${username}@example.com`;
  const password = "password123";

  await page.goto("/");

  await page.getByTestId("tab-register").click();
  await page.getByTestId("input-reg-username").fill(username);
  await page.getByTestId("input-reg-displayname").fill("E2E User");
  await page.getByTestId("input-reg-email").fill(email);
  await page.getByTestId("input-reg-password").fill(password);
  await page.getByTestId("input-reg-password2").fill(password);
  await page.getByTestId("btn-register").click();

  await expect(page.getByTestId("btn-add-meal")).toBeVisible();

  await page.getByTestId("btn-add-meal").click();
  await page.getByTestId("input-food-text").fill("Гречка с курицей");
  await page.getByTestId("btn-save-meal").click();

  await expect(page.getByText("Гречка с курицей")).toBeVisible();

  await page.locator('[data-testid^="btn-edit-meal-"]').first().click();
  await expect(page.getByText("Редактирование приёма пищи")).toBeVisible();
  await expect(page.getByTestId("input-meal-date")).toBeEnabled();
  await page.getByTestId("input-food-text").fill("Гречка с индейкой");
  await page.getByTestId("input-context-note").fill("Обновил запись в дневнике");
  await page.getByTestId("btn-save-meal").click();

  await expect(page.getByText("Гречка с индейкой")).toBeVisible();
  await expect(page.getByText("Обновил запись в дневнике")).toBeVisible();
  await expect(page.getByText("Гречка с курицей")).not.toBeVisible();

  await page.getByTestId("btn-logout").click();
  await expect(page.getByTestId("btn-login")).toBeVisible();

  await page.getByTestId("input-login-username").fill(username);
  await page.getByTestId("input-login-password").fill(password);
  await page.getByTestId("btn-login").click();

  await expect(page.getByTestId("btn-add-meal")).toBeVisible();
  await expect(page.getByText("Гречка с индейкой")).toBeVisible();
});
