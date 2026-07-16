import { PayrollEntity, PayrollItemEntity } from '../entities/payroll.entity';

export interface IPayrollRepository {
  findById(id: string, companyId: string): Promise<PayrollEntity | null>;
  findByPeriod(companyId: string, period: string): Promise<PayrollEntity | null>;
  findByCompany(companyId: string): Promise<PayrollEntity[]>;
  create(
    payroll: Omit<PayrollEntity, 'id' | 'createdAt' | 'updatedAt' | 'items'>,
    items: Omit<PayrollItemEntity, 'id' | 'payrollId' | 'createdAt' | 'updatedAt'>[]
  ): Promise<PayrollEntity>;
  delete(id: string, companyId: string): Promise<PayrollEntity>;
}
