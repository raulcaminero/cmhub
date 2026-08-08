export interface RetentionTemplate {
  id: string;
  label: string;
  isrRate: number;
  itbisRetainedRate: number;
}

export const RETENTION_TEMPLATES: RetentionTemplate[] = [
  { id: 'alquiler', label: 'Alquiler Comercial (10% ISR / 100% ITBIS)', isrRate: 0.10, itbisRetainedRate: 1.0 },
  { id: 'honorarios', label: 'Honorarios Profesionales (10% ISR / 30% ITBIS)', isrRate: 0.10, itbisRetainedRate: 0.30 },
  { id: 'servicios_tecnicos', label: 'Servicios Técnicos y Otros (2% ISR / 30% ITBIS)', isrRate: 0.02, itbisRetainedRate: 0.30 },
  { id: 'limpieza_seguridad', label: 'Servicios de Seguridad/Limpieza (2% ISR / 100% ITBIS)', isrRate: 0.02, itbisRetainedRate: 1.0 },
  { id: 'informal', label: 'Compra a Proveedor Informal (Sin ISR / 100% ITBIS)', isrRate: 0.0, itbisRetainedRate: 1.0 },
];

export interface RetentionCalculationResult {
  grossAmount: number;
  itbis: number;
  itbisRetained: number;
  isrRetained: number;
  netToProvider: number;
  totalToDgi: number;
}

export function roundToTwoDecimals(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function calculateRetentions(
  grossAmount: number,
  templateId: string,
  itbisRate: number = 0.18
): RetentionCalculationResult {
  const template = RETENTION_TEMPLATES.find((t) => t.id === templateId) || RETENTION_TEMPLATES[1];

  const itbis = roundToTwoDecimals(grossAmount * itbisRate);
  const itbisRetained = roundToTwoDecimals(itbis * template.itbisRetainedRate);
  const isrRetained = roundToTwoDecimals(grossAmount * template.isrRate);
  const netToProvider = roundToTwoDecimals(grossAmount + itbis - itbisRetained - isrRetained);
  const totalToDgi = roundToTwoDecimals(itbisRetained + isrRetained);

  return {
    grossAmount,
    itbis,
    itbisRetained,
    isrRetained,
    netToProvider,
    totalToDgi,
  };
}

export interface PayrollDeductionResult {
  monthlySalary: number;
  sfsEmployee: number;
  afpEmployee: number;
  totalTssEmployee: number;
  isrTax: number;
  totalEmployeeDeductions: number;
  netSalary: number;
  sfsEmployer: number;
  afpEmployer: number;
  arlEmployer: number;
  totalTssEmployer: number;
}

export function calculatePayrollDeductions(monthlySalary: number): PayrollDeductionResult {
  // TSS Rates (Dominican Republic)
  const SFS_EMP_RATE = 0.0304; // 3.04%
  const AFP_EMP_RATE = 0.0287; // 2.87%
  const SFS_PAT_RATE = 0.0709; // 7.09%
  const AFP_PAT_RATE = 0.0710; // 7.10%
  const ARL_PAT_RATE = 0.0110; // 1.10%

  const sfsEmployee = roundToTwoDecimals(monthlySalary * SFS_EMP_RATE);
  const afpEmployee = roundToTwoDecimals(monthlySalary * AFP_EMP_RATE);
  const totalTssEmployee = roundToTwoDecimals(sfsEmployee + afpEmployee);

  // Taxable Income for ISR (IR-3) = Gross Salary - Employee TSS
  const taxableMonthlyIncome = monthlySalary - totalTssEmployee;
  const taxableAnnualIncome = taxableMonthlyIncome * 12;

  let annualIsr = 0;
  if (taxableAnnualIncome <= 416220.00) {
    annualIsr = 0;
  } else if (taxableAnnualIncome <= 624329.00) {
    annualIsr = (taxableAnnualIncome - 416220.00) * 0.15;
  } else if (taxableAnnualIncome <= 867123.00) {
    annualIsr = 31216.00 + (taxableAnnualIncome - 624329.00) * 0.20;
  } else {
    annualIsr = 79776.00 + (taxableAnnualIncome - 867123.00) * 0.25;
  }

  const isrTax = roundToTwoDecimals(annualIsr / 12);
  const totalEmployeeDeductions = roundToTwoDecimals(totalTssEmployee + isrTax);
  const netSalary = roundToTwoDecimals(monthlySalary - totalEmployeeDeductions);

  const sfsEmployer = roundToTwoDecimals(monthlySalary * SFS_PAT_RATE);
  const afpEmployer = roundToTwoDecimals(monthlySalary * AFP_PAT_RATE);
  const arlEmployer = roundToTwoDecimals(monthlySalary * ARL_PAT_RATE);
  const totalTssEmployer = roundToTwoDecimals(sfsEmployer + afpEmployer + arlEmployer);

  return {
    monthlySalary,
    sfsEmployee,
    afpEmployee,
    totalTssEmployee,
    isrTax,
    totalEmployeeDeductions,
    netSalary,
    sfsEmployer,
    afpEmployer,
    arlEmployer,
    totalTssEmployer,
  };
}

export interface FinancialSummaryResult {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  profitMarginPercentage: number;
}

export function calculateProfitAndLoss(
  incomeAmounts: number[],
  expenseAmounts: number[]
): FinancialSummaryResult {
  const totalIncome = roundToTwoDecimals(incomeAmounts.reduce((sum, val) => sum + val, 0));
  const totalExpenses = roundToTwoDecimals(expenseAmounts.reduce((sum, val) => sum + val, 0));
  const netIncome = roundToTwoDecimals(totalIncome - totalExpenses);
  const profitMarginPercentage = totalIncome > 0 
    ? roundToTwoDecimals((netIncome / totalIncome) * 100) 
    : 0;

  return {
    totalIncome,
    totalExpenses,
    netIncome,
    profitMarginPercentage,
  };
}

export interface DoubleEntryValidationResult {
  isBalanced: boolean;
  totalDebits: number;
  totalCredits: number;
  difference: number;
}

export function validateDoubleEntry(
  lines: { debit: number; credit: number }[]
): DoubleEntryValidationResult {
  const totalDebits = roundToTwoDecimals(lines.reduce((sum, l) => sum + (l.debit || 0), 0));
  const totalCredits = roundToTwoDecimals(lines.reduce((sum, l) => sum + (l.credit || 0), 0));
  const difference = roundToTwoDecimals(Math.abs(totalDebits - totalCredits));
  const isBalanced = difference < 0.01;

  return {
    isBalanced,
    totalDebits,
    totalCredits,
    difference,
  };
}
