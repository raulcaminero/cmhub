export class PayrollItemEntity {
  id: string;
  payrollId: string;
  employeeId: string;
  grossSalary: number;
  sfsEmployee: number;
  afpEmployee: number;
  isrDeduction: number;
  netSalary: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Optional relations
  employeeName?: string;
  employeeCedula?: string;
  employeeJobTitle?: string | null;
}

export class PayrollEntity {
  id: string;
  companyId: string;
  period: string;
  grossSalary: number;
  sfsEmployee: number;
  sfsEmployer: number;
  afpEmployee: number;
  afpEmployer: number;
  arlEmployer: number;
  isrDeduction: number;
  netSalary: number;
  journalEntryId: string | null;
  createdAt: Date;
  updatedAt: Date;
  
  items?: PayrollItemEntity[];
}
