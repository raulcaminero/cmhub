import { ExpenseEntity } from '../entities/expense.entity';

export interface IExpenseRepository {
  findById(id: string, companyId: string): Promise<ExpenseEntity | null>;
  findByCompany(companyId: string): Promise<ExpenseEntity[]>;
  create(data: Omit<ExpenseEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExpenseEntity>;
  update(id: string, companyId: string, data: Partial<ExpenseEntity>): Promise<ExpenseEntity>;
  delete(id: string, companyId: string): Promise<ExpenseEntity>;
}
