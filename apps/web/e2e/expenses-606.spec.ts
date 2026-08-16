import { test, expect } from '@playwright/test';

test.describe('Expenses 606 & Vendor Purchases Module', () => {
  test('expenses route is protected against unauthenticated access', async ({ page }) => {
    await page.goto('/cmhub/accounting/expenses');
    await expect(page).toHaveURL(/\/login/);
  });

  test('contacts provider route is protected against unauthenticated access', async ({ page }) => {
    await page.goto('/cmhub/contacts');
    await expect(page).toHaveURL(/\/login/);
  });
});
