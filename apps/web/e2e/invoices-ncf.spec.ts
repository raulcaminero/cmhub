import { test, expect } from '@playwright/test';

test.describe('Invoices & NCF Allocation Flow', () => {
  test('invoices page route is protected', async ({ page }) => {
    await page.goto('/cmhub/sales/invoices/new');
    await expect(page).toHaveURL(/\/login/);
  });

  test('ncf module route is protected', async ({ page }) => {
    await page.goto('/cmhub/ncf');
    await expect(page).toHaveURL(/\/login/);
  });
});
