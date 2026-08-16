import { test, expect } from '@playwright/test';

test.describe('Sales Catalog & Quotations Module', () => {
  test('sales module redirects unauthenticated request to login', async ({ page }) => {
    await page.goto('/cmhub/sales?tab=catalog');
    await expect(page).toHaveURL(/\/login/);
  });

  test('quotations tab route redirects unauthenticated request to login', async ({ page }) => {
    await page.goto('/cmhub/sales?tab=quotations');
    await expect(page).toHaveURL(/\/login/);
  });
});
