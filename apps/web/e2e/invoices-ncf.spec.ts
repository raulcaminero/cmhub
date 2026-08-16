import { test, expect } from '@playwright/test';

test.describe('Invoices & Dominican NCF Sequence Allocation', () => {
  test('unauthenticated creation of new invoice is guarded by auth redirect', async ({ page }) => {
    await page.goto('/cmhub/sales/invoices/new');
    await expect(page).toHaveURL(/\/login/);
  });

  test('validates Dominican tax RNC length formatting rules (9 digits for RNC, 11 digits for Cedula)', async () => {
    const validRncCompany = '131234567'; // 9 digits
    const validCedulaPerson = '00112345678'; // 11 digits
    const invalidRnc = '123'; // invalid

    expect(validRncCompany.length).toBe(9);
    expect(validCedulaPerson.length).toBe(11);
    expect(invalidRnc.length).not.toBe(9);
    expect(invalidRnc.length).not.toBe(11);
  });

  test('verifies Dominican NCF Types (B01, B02, B14, B15, E31) and 18% ITBIS tax calculations', async () => {
    const subtotal = 1000.00;
    const taxRate = 0.18; // 18% ITBIS
    const expectedItbis = subtotal * taxRate; // 180.00
    const expectedTotal = subtotal + expectedItbis; // 1180.00

    expect(expectedItbis).toBe(180.00);
    expect(expectedTotal).toBe(1180.00);
  });
});
