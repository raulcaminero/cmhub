import { describe, it, expect } from 'vitest';
import {
  calculateRetentions,
  calculatePayrollDeductions,
  calculateProfitAndLoss,
  validateDoubleEntry,
  roundToTwoDecimals,
} from './financial-calculations';

describe('Financial & Tax Calculations Engine (CMHub)', () => {
  describe('roundToTwoDecimals', () => {
    it('should accurately round floating point numbers to 2 decimal places', () => {
      expect(roundToTwoDecimals(100.555)).toBe(100.56);
      expect(roundToTwoDecimals(100.554)).toBe(100.55);
      expect(roundToTwoDecimals(0.1 + 0.2)).toBe(0.3);
    });
  });

  describe('DGII Tax Retention Calculations (calculateRetentions)', () => {
    it('should calculate Alquiler Comercial retentions correctly (10% ISR, 100% ITBIS)', () => {
      // Gross = 50,000
      // ITBIS 18% = 9,000
      // ITBIS Retained 100% = 9,000
      // ISR Retained 10% = 5,000
      // Net to Provider = 50,000 + 9,000 - 9,000 - 5,000 = 45,000
      // Total to DGII = 9,000 + 5,000 = 14,000
      const result = calculateRetentions(50000, 'alquiler', 0.18);

      expect(result.grossAmount).toBe(50000);
      expect(result.itbis).toBe(9000);
      expect(result.itbisRetained).toBe(9000);
      expect(result.isrRetained).toBe(5000);
      expect(result.netToProvider).toBe(45000);
      expect(result.totalToDgi).toBe(14000);
    });

    it('should calculate Honorarios Profesionales retentions correctly (10% ISR, 30% ITBIS)', () => {
      // Gross = 100,000
      // ITBIS 18% = 18,000
      // ITBIS Retained 30% = 5,400
      // ISR Retained 10% = 10,000
      // Net to Provider = 100,000 + 18,000 - 5,400 - 10,000 = 102,600
      // Total to DGII = 5,400 + 10,000 = 15,400
      const result = calculateRetentions(100000, 'honorarios', 0.18);

      expect(result.grossAmount).toBe(100000);
      expect(result.itbis).toBe(18000);
      expect(result.itbisRetained).toBe(5400);
      expect(result.isrRetained).toBe(10000);
      expect(result.netToProvider).toBe(102600);
      expect(result.totalToDgi).toBe(15400);
    });

    it('should calculate Servicios Técnicos retentions correctly (2% ISR, 30% ITBIS)', () => {
      // Gross = 25,000
      // ITBIS 18% = 4,500
      // ITBIS Retained 30% = 1,350
      // ISR Retained 2% = 500
      // Net to Provider = 25,000 + 4,500 - 1,350 - 500 = 27,650
      const result = calculateRetentions(25000, 'servicios_tecnicos', 0.18);

      expect(result.itbis).toBe(4500);
      expect(result.itbisRetained).toBe(1350);
      expect(result.isrRetained).toBe(500);
      expect(result.netToProvider).toBe(27650);
      expect(result.totalToDgi).toBe(1850);
    });

    it('should calculate Proveedor Informal retentions correctly (0% ISR, 100% ITBIS)', () => {
      const result = calculateRetentions(15000, 'informal', 0.18);

      expect(result.itbis).toBe(2700);
      expect(result.itbisRetained).toBe(2700);
      expect(result.isrRetained).toBe(0);
      expect(result.netToProvider).toBe(15000);
      expect(result.totalToDgi).toBe(2700);
    });
  });

  describe('Payroll & IR-3 Tax Deductions (calculatePayrollDeductions)', () => {
    it('should calculate TSS employee and employer contributions accurately', () => {
      const salary = 50000;
      const result = calculatePayrollDeductions(salary);

      // Employee TSS
      expect(result.sfsEmployee).toBe(1520); // 50,000 * 0.0304
      expect(result.afpEmployee).toBe(1435); // 50,000 * 0.0287
      expect(result.totalTssEmployee).toBe(2955); // 1520 + 1435

      // Employer TSS
      expect(result.sfsEmployer).toBe(3545); // 50,000 * 0.0709
      expect(result.afpEmployer).toBe(3550); // 50,000 * 0.0710
      expect(result.arlEmployer).toBe(550);  // 50,000 * 0.0110
      expect(result.totalTssEmployer).toBe(7645);
    });

    it('should return 0 ISR for salaries under the annual exempt limit (<= RD$416,220/yr)', () => {
      // Monthly 30,000 -> Annual taxable ~338k (exempt)
      const result = calculatePayrollDeductions(30000);

      expect(result.isrTax).toBe(0);
      expect(result.netSalary).toBe(30000 - result.totalTssEmployee);
    });

    it('should calculate ISR correctly for Tier 2 salaries (15% over RD$416,220)', () => {
      // Monthly 45,000 -> TSS = 2,659.50 -> Taxable Monthly = 42,340.50 -> Annual = 508,086.00
      // Excess over 416,220 = 91,866.00
      // Annual ISR (15%) = 13,779.90 -> Monthly ISR = 1,148.33
      const result = calculatePayrollDeductions(45000);

      expect(result.isrTax).toBeGreaterThan(1100);
      expect(result.isrTax).toBeLessThan(1200);
      expect(result.netSalary).toBe(roundToTwoDecimals(45000 - result.totalEmployeeDeductions));
    });

    it('should calculate ISR correctly for high Tier 4 salaries (25% over RD$867,123)', () => {
      const result = calculatePayrollDeductions(120000);

      expect(result.isrTax).toBeGreaterThan(13000);
      expect(result.netSalary).toBe(roundToTwoDecimals(120000 - result.totalEmployeeDeductions));
    });
  });

  describe('Profit & Loss / Income vs Expenses (calculateProfitAndLoss)', () => {
    it('should calculate total income, total expenses, net income and profit margin percentage', () => {
      const salesInvoices = [15000, 25000, 10000]; // Total Income = 50,000
      const expenses = [5000, 12000, 3000];       // Total Expenses = 20,000

      const result = calculateProfitAndLoss(salesInvoices, expenses);

      expect(result.totalIncome).toBe(50000);
      expect(result.totalExpenses).toBe(20000);
      expect(result.netIncome).toBe(30000); // 50,000 - 20,000 = 30,000
      expect(result.profitMarginPercentage).toBe(60); // 30,000 / 50,000 * 100 = 60%
    });

    it('should handle negative net income (loss) accurately', () => {
      const salesInvoices = [10000];
      const expenses = [25000];

      const result = calculateProfitAndLoss(salesInvoices, expenses);

      expect(result.netIncome).toBe(-15000);
      expect(result.profitMarginPercentage).toBe(-150);
    });
  });

  describe('Double Entry Accounting Balance (validateDoubleEntry)', () => {
    it('should confirm a balanced journal entry where sum(debits) === sum(credits)', () => {
      const lines = [
        { debit: 11800, credit: 0 },   // Banco / CxC
        { debit: 0, credit: 10000 },  // Venta
        { debit: 0, credit: 1800 },   // ITBIS Cobrado
      ];

      const result = validateDoubleEntry(lines);

      expect(result.totalDebits).toBe(11800);
      expect(result.totalCredits).toBe(11800);
      expect(result.difference).toBe(0);
      expect(result.isBalanced).toBe(true);
    });

    it('should flag an unbalanced journal entry where debits do not equal credits', () => {
      const lines = [
        { debit: 10000, credit: 0 },
        { debit: 0, credit: 8000 },
      ];

      const result = validateDoubleEntry(lines);

      expect(result.totalDebits).toBe(10000);
      expect(result.totalCredits).toBe(8000);
      expect(result.difference).toBe(2000);
      expect(result.isBalanced).toBe(false);
    });
  });
});
