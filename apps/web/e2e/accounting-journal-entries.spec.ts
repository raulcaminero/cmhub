import { test, expect } from '@playwright/test';

test.describe('Journal Entries & Double-Entry Accounting Module', () => {
  test('unauthenticated request to accounting module is safely guarded', async ({ page }) => {
    await page.goto('/cmhub/accounting');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page elements are ready for accounting user interaction', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});
