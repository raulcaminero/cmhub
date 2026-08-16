import { test, expect } from '@playwright/test';

test.describe('Accounting Module Structure & Route Verification', () => {
  test('accounting route handles unauthenticated redirection safely', async ({ page }) => {
    await page.goto('/cmhub/accounting');
    await expect(page).toHaveURL(/\/login/);
  });

  test('reports route handles unauthenticated redirection safely', async ({ page }) => {
    await page.goto('/cmhub/reports');
    await expect(page).toHaveURL(/\/login/);
  });

  test('sales route handles unauthenticated redirection safely', async ({ page }) => {
    await page.goto('/cmhub/sales');
    await expect(page).toHaveURL(/\/login/);
  });
});
