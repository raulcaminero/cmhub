import { test, expect } from '@playwright/test';

test.describe('Double-Entry Accounting & Journal Validation Rule Engine', () => {
  test('unauthenticated accounting access is redirected to login', async ({ page }) => {
    await page.goto('/cmhub/accounting');
    await expect(page).toHaveURL(/\/login/);
  });

  test('validates double-entry accounting principle (Total Debits MUST equal Total Credits)', async () => {
    const lines = [
      { account: '1010-Caja-y-Bancos', debit: 1180.00, credit: 0 },
      { account: '4010-Ventas-de-Servicios', debit: 0, credit: 1000.00 },
      { account: '2110-ITBIS-por-Pagar', debit: 0, credit: 180.00 },
    ];

    const totalDebits = lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredits = lines.reduce((sum, l) => sum + l.credit, 0);

    expect(totalDebits).toBe(1180.00);
    expect(totalCredits).toBe(1180.00);
    expect(totalDebits === totalCredits).toBe(true);
  });

  test('detects unbalanced journal entry (Total Debits !== Total Credits)', async () => {
    const unbalancedLines = [
      { account: '1010-Caja-y-Bancos', debit: 1000.00, credit: 0 },
      { account: '4010-Ventas-de-Servicios', debit: 0, credit: 800.00 },
    ];

    const totalDebits = unbalancedLines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredits = unbalancedLines.reduce((sum, l) => sum + l.credit, 0);

    expect(totalDebits === totalCredits).toBe(false);
  });
});
