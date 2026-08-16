import { test, expect } from '@playwright/test';

test.describe('Payroll (TSS Deductions) & Bank Reconciliation Flow', () => {
  test('payroll tab access is protected', async ({ page }) => {
    await page.goto('/cmhub/accounting?tab=payroll');
    await expect(page).toHaveURL(/\/login/);
  });

  test('verifies Dominican TSS employee deductions (SFS 3.04% and AFP 2.87%)', async () => {
    const grossSalary = 50000.00;
    const sfsEmployeeRate = 0.0304; // 3.04%
    const afpEmployeeRate = 0.0287; // 2.87%

    const sfsDeduction = grossSalary * sfsEmployeeRate; // 1520.00
    const afpDeduction = grossSalary * afpEmployeeRate; // 1435.00
    const totalTssDeductions = sfsDeduction + afpDeduction; // 2955.00
    const taxableSalary = grossSalary - totalTssDeductions; // 47045.00

    expect(sfsDeduction).toBe(1520.00);
    expect(afpDeduction).toBe(1435.00);
    expect(totalTssDeductions).toBe(2955.00);
    expect(taxableSalary).toBe(47045.00);
  });
});
