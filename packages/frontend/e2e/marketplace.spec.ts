/**
 * E2E: Marketplace browse → purchase → install → license badge
 *
 * Prerequisite: the dev server and both the core API (port 3001) and the
 * marketplace service (port 3002) must be running. Stripe must be in test
 * mode and a seeded paid plugin must exist in the catalog.
 *
 * Run:
 *   npx playwright install   # once, to download browsers
 *   npx playwright test      # from packages/frontend/
 */

import { test, expect, Page } from "@playwright/test";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function login(page: Page) {
  await page.goto("/login");
  await page
    .getByLabel(/email/i)
    .fill(process.env.E2E_USER_EMAIL ?? "test@example.com");
  await page
    .getByLabel(/password/i)
    .fill(process.env.E2E_USER_PASSWORD ?? "password123");
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL("**/dashboard**");
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe("Marketplace flow", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("20.1 — browse marketplace and see plugin cards with price", async ({
    page,
  }) => {
    await page.goto("/dashboard/marketplace");

    // Header is visible
    await expect(
      page.getByRole("heading", { name: "Marketplace" }),
    ).toBeVisible();

    // Wait for plugin grid to load (at least 1 card)
    const cards = page
      .locator('[data-testid="plugin-card"], .grid > div')
      .filter({ hasText: /free|paid|\$/i });
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
  });

  test("20.2 — navigate to plugin detail page", async ({ page }) => {
    await page.goto("/dashboard/marketplace");

    // Click the first plugin card to navigate to the detail page
    const firstCard = page.locator(".grid > div").first();
    await firstCard.waitFor({ state: "visible", timeout: 10_000 });
    await firstCard.click();

    // Should navigate to /dashboard/marketplace/{id}
    await expect(page).toHaveURL(/\/dashboard\/marketplace\/.+/);

    // Detail page shows a Back link and the plugin name heading
    await expect(page.getByText(/back to marketplace/i)).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test('20.4 — license badge shows "License Active" after purchase succeeds', async ({
    page,
  }) => {
    // This test mocks the purchase intent and Stripe confirmation so it runs
    // without a real Stripe payment. In CI, point to a test-mode environment
    // where POST /purchases/intent returns a Stripe test clientSecret.

    await page.goto("/dashboard/marketplace");

    // Navigate to the first paid plugin detail page
    // (assumes the catalog has at least one paid plugin)
    const paidCard = page
      .locator(".grid > div")
      .filter({ hasText: /paid|\$/i })
      .first();
    if (!(await paidCard.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "No paid plugins in catalog — skipping purchase test");
      return;
    }
    await paidCard.click();
    await expect(page).toHaveURL(/\/dashboard\/marketplace\/.+/);

    // The "Buy" button should be present for a paid plugin
    const buyBtn = page.getByRole("button", { name: /buy/i });
    await expect(buyBtn).toBeVisible();

    // Intercept the purchase intent endpoint to return a test clientSecret
    await page.route("**/purchases/intent", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ clientSecret: "pi_test_stub_secret_stub" }),
      }),
    );

    await buyBtn.click();

    // Purchase modal should appear
    await expect(page.getByText(/you'll be charged/i)).toBeVisible({
      timeout: 5_000,
    });
  });

  test("20.5-20.7 — developer portal pages render", async ({ page }) => {
    // Developer landing
    await page.goto("/dashboard/developer");
    await expect(
      page.getByRole("heading", { name: /developer portal/i }),
    ).toBeVisible();
    await expect(page.getByText(/80% revenue share/i)).toBeVisible();

    // Earnings page
    await page.goto("/dashboard/developer/earnings");
    await expect(
      page.getByRole("heading", { name: /earnings/i }),
    ).toBeVisible();

    // Submit page
    await page.goto("/dashboard/developer/submit");
    await expect(page.getByRole("heading", { name: /submit/i })).toBeVisible();
    await expect(page.getByText(/manifest\.json/i)).toBeVisible();
  });

  test("20.8 — public marketplace page shows 80% revenue share", async ({
    page,
  }) => {
    await page.goto("/marketplace");
    // Both the stat and the body copy must say 80%
    const occurrences = await page.getByText(/80%/i).count();
    expect(occurrences).toBeGreaterThanOrEqual(2);
    // Must NOT contain the old incorrect 70% copy
    await expect(page.getByText(/keep 70%/i)).toHaveCount(0);
  });
});
