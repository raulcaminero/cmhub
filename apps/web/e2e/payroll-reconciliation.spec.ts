import { test, expect } from '@playwright/test';

test.describe('Payroll & Bank Reconciliation E2E Verification', () => {
  test('unauthenticated access to accounting dashboard redirects to login', async ({ page }) => {
    await page.goto('/cmhub/accounting?tab=payroll');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated access to bank reconciliation redirects to login', async ({ page }) => {
    await page.goto('/cmhub/accounting?tab=reconciliation');
    await expect(page).toHaveURL(/\/login/);
  });
});
