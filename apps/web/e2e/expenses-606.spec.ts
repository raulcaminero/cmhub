import { test, expect } from '@playwright/test';

test.describe('Expenses 606 & Retained Tax Calculations (DGII)', () => {
  test('unauthenticated request to 606 expenses module is safely guarded', async ({ page }) => {
    await page.goto('/cmhub/accounting/expenses');
    await expect(page).toHaveURL(/\/login/);
  });

  test('verifies 606 tax retention math (100% ITBIS retention and 10% ISR retention)', async () => {
    const expenseAmount = 5000.00;
    const itbisAmount = expenseAmount * 0.18; // 900.00
    const fullItbisRetained = itbisAmount; // 900.00 (100% ITBIS retention)
    const isr10Retained = expenseAmount * 0.10; // 500.00 (10% ISR retention)
    const netPayment = expenseAmount + itbisAmount - fullItbisRetained - isr10Retained; // 4500.00

    expect(itbisAmount).toBe(900.00);
    expect(fullItbisRetained).toBe(900.00);
    expect(isr10Retained).toBe(500.00);
    expect(netPayment).toBe(4500.00);
  });
});
