import { test, expect } from '@playwright/test';

test.describe('Tax Reports & System Settings Module', () => {
  test('tax copilot module route is protected', async ({ page }) => {
    await page.goto('/cmhub/tax');
    await expect(page).toHaveURL(/\/login/);
  });

  test('settings module route is protected', async ({ page }) => {
    await page.goto('/cmhub/settings');
    await expect(page).toHaveURL(/\/login/);
  });
});
