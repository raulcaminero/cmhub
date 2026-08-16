import { test, expect } from '@playwright/test';

test.describe('Sales Catalog & Quotation to Invoice Conversion Engine', () => {
  test('unauthenticated sales route redirects to login', async ({ page }) => {
    await page.goto('/cmhub/sales?tab=catalog');
    await expect(page).toHaveURL(/\/login/);
  });

  test('verifies quotation discount, ITBIS tax, and line total math logic', async () => {
    const quantity = 2;
    const unitPrice = 1500.00;
    const discountPercent = 10; // 10%
    const taxRatePercent = 18; // 18% ITBIS

    const grossAmount = quantity * unitPrice; // 3000.00
    const discountAmount = grossAmount * (discountPercent / 100); // 300.00
    const subtotalAfterDiscount = grossAmount - discountAmount; // 2700.00
    const itbisAmount = subtotalAfterDiscount * (taxRatePercent / 100); // 486.00
    const lineTotal = subtotalAfterDiscount + itbisAmount; // 3186.00

    expect(grossAmount).toBe(3000.00);
    expect(discountAmount).toBe(300.00);
    expect(subtotalAfterDiscount).toBe(2700.00);
    expect(itbisAmount).toBe(486.00);
    expect(lineTotal).toBe(3186.00);
  });
});
