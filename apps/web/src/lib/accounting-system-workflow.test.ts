import { describe, it, expect } from 'vitest';
import {
  calculateRetentions,
  calculatePayrollDeductions,
  calculateProfitAndLoss,
  validateDoubleEntry,
  roundToTwoDecimals,
} from './financial-calculations';

/**
 * Suite de Pruebas de Integración de Flujos del Sistema Contable CMHub
 * Simula ciclos completos de operaciones comerciales, fiscales y contables.
 */
describe('CMHub Full Accounting & Business Workflow System Tests', () => {

  it('Workflow 1: Ciclo completo de Emisión de Factura de Venta y Asiento Contable', () => {
    // 1. Datos de Venta
    const subtotal = 150000; // RD$150,000
    const itbisRate = 0.18;
    const itbisAmount = roundToTwoDecimals(subtotal * itbisRate); // RD$27,000
    const totalInvoice = roundToTwoDecimals(subtotal + itbisAmount); // RD$177,000

    expect(itbisAmount).toBe(27000);
    expect(totalInvoice).toBe(177000);

    // 2. Generación automática del Asiento Contable de Venta a Crédito
    // Débito: Cuentas por Cobrar (1102) = 177,000
    // Crédito: Ingresos por Ventas (4101) = 150,000
    // Crédito: ITBIS por Pagar DGII (2103) = 27,000
    const journalLines = [
      { accountCode: '1102', accountName: 'Cuentas por Cobrar Clientes', debit: totalInvoice, credit: 0 },
      { accountCode: '4101', accountName: 'Ventas de Servicios', debit: 0, credit: subtotal },
      { accountCode: '2103', accountName: 'ITBIS Por Pagar', debit: 0, credit: itbisAmount },
    ];

    const doubleEntry = validateDoubleEntry(journalLines);

    expect(doubleEntry.isBalanced).toBe(true);
    expect(doubleEntry.totalDebits).toBe(177000);
    expect(doubleEntry.totalCredits).toBe(177000);
    expect(doubleEntry.difference).toBe(0);
  });

  it('Workflow 2: Ciclo de Registro de Gasto por Honorarios con Retención DGII y Partida Doble', () => {
    // 1. Registro de Factura de Proveedor por Honorarios Profesionales (RD$80,000)
    const grossAmount = 80000;
    const retentionResult = calculateRetentions(grossAmount, 'honorarios', 0.18);

    // Verificaciones fiscales
    expect(retentionResult.itbis).toBe(14400);        // 18% ITBIS
    expect(retentionResult.itbisRetained).toBe(4320);   // 30% del ITBIS
    expect(retentionResult.isrRetained).toBe(8000);     // 10% ISR
    expect(retentionResult.netToProvider).toBe(82080);  // 80k + 14.4k - 4.32k - 8k
    expect(retentionResult.totalToDgi).toBe(12320);    // 4.32k + 8k

    // 2. Asiento Contable del Gasto
    // Débito: Gasto Honorarios (6102) = 80,000
    // Débito: ITBIS Deducible en Compras (1105) = 14,400 (ITBIS total facturado)
    // Crédito: Banco / Cuentas por Pagar (1101/2101) = 82,080 (Neto pagado al proveedor)
    // Crédito: Retención ITBIS por Pagar DGII (2104) = 4,320 (ITBIS retenido a pagar a DGII)
    // Crédito: Retención ISR por Pagar DGII (2105) = 8,000 (ISR retenido a pagar a DGII)
    // Total Débitos (80,000 + 14,400) = 94,400
    // Total Créditos (82,080 + 4,320 + 8,000) = 94,400
    const expenseJournal = [
      { accountCode: '6102', name: 'Gastos de Honorarios', debit: grossAmount, credit: 0 },
      { accountCode: '1105', name: 'ITBIS Adelantado en Compras', debit: retentionResult.itbis, credit: 0 },
      { accountCode: '1101', name: 'Banco Popular', debit: 0, credit: retentionResult.netToProvider },
      { accountCode: '2104', name: 'Retención ITBIS por Pagar', debit: 0, credit: retentionResult.itbisRetained },
      { accountCode: '2105', name: 'Retención ISR por Pagar', debit: 0, credit: retentionResult.isrRetained },
    ];

    const doubleEntry = validateDoubleEntry(expenseJournal);

    expect(doubleEntry.isBalanced).toBe(true);
    expect(doubleEntry.totalDebits).toBe(94400);
    expect(doubleEntry.totalCredits).toBe(94400);
  });

  it('Workflow 3: Simulación de Cierre Mensual: Comparativa Ganancias vs Gastos y Resultado Neto', () => {
    // Transacciones del mes:
    // Ingresos por ventas: 3 facturas (RD$100,000, RD$85,000, RD$65,000)
    const monthlyIncomes = [100000, 85000, 65000]; // Total = RD$250,000

    // Gastos operativos: Renta, Servicios, Nómina, Publicidad
    const monthlyExpenses = [40000, 15000, 90000, 12000]; // Total = RD$157,000

    const pnl = calculateProfitAndLoss(monthlyIncomes, monthlyExpenses);

    expect(pnl.totalIncome).toBe(250000);
    expect(pnl.totalExpenses).toBe(157000);
    expect(pnl.netIncome).toBe(93000); // RD$93,000 de ganancia neta
    expect(pnl.profitMarginPercentage).toBe(37.2); // 93,000 / 250,000 * 100 = 37.2%
  });

  it('Workflow 4: Procesamiento de Nómina Multi-Empleado y Asiento de Cierre de Sueldos', () => {
    // 3 empleados con distintos salarios
    const emp1 = calculatePayrollDeductions(35000); // Junior
    const emp2 = calculatePayrollDeductions(65000); // Senior
    const emp3 = calculatePayrollDeductions(140000); // Gerente

    const totalGrossSalary = 35000 + 65000 + 140000; // 240,000
    const totalTssEmp = emp1.totalTssEmployee + emp2.totalTssEmployee + emp3.totalTssEmployee;
    const totalIsrEmp = emp1.isrTax + emp2.isrTax + emp3.isrTax;
    const totalNetPay = emp1.netSalary + emp2.netSalary + emp3.netSalary;
    const totalTssPatronal = emp1.totalTssEmployer + emp2.totalTssEmployer + emp3.totalTssEmployer;

    // Verificar cuadre matemático de deducciones
    expect(roundToTwoDecimals(totalGrossSalary - totalTssEmp - totalIsrEmp)).toBe(totalNetPay);

    // Asiento de Nómina Mensual:
    // Débito: Gasto de Sueldos (6101) = 240,000
    // Débito: Gasto Cargas Sociales Patronales (6103) = totalTssPatronal
    // Crédito: Retención TSS por Pagar (2106) = totalTssEmp
    // Crédito: Retención ISR IR-3 por Pagar (2107) = totalIsrEmp
    // Crédito: TSS Patronal por Pagar (2108) = totalTssPatronal
    // Crédito: Banco Sueldos por Pagar (1101) = totalNetPay
    const payrollJournal = [
      { accountCode: '6101', name: 'Gastos de Salarios', debit: totalGrossSalary, credit: 0 },
      { accountCode: '6103', name: 'Gastos TSS Patronal', debit: totalTssPatronal, credit: 0 },
      { accountCode: '2106', name: 'TSS Empleados por Pagar', debit: 0, credit: totalTssEmp },
      { accountCode: '2107', name: 'ISR IR-3 por Pagar', debit: 0, credit: totalIsrEmp },
      { accountCode: '2108', name: 'TSS Patronal por Pagar', debit: 0, credit: totalTssPatronal },
      { accountCode: '1101', name: 'Banco Sueldos por Pagar', debit: 0, credit: totalNetPay },
    ];

    const balanceResult = validateDoubleEntry(payrollJournal);

    expect(balanceResult.isBalanced).toBe(true);
    expect(balanceResult.totalDebits).toBe(balanceResult.totalCredits);
  });
});
