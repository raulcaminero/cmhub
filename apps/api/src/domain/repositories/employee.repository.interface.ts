import { EmployeeEntity } from '../entities/employee.entity';

export interface IEmployeeRepository {
  findById(id: string, companyId: string): Promise<EmployeeEntity | null>;
  findByCedula(companyId: string, cedula: string): Promise<EmployeeEntity | null>;
  findByCompany(companyId: string): Promise<EmployeeEntity[]>;
  create(data: Omit<EmployeeEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmployeeEntity>;
  update(id: string, companyId: string, data: Partial<Omit<EmployeeEntity, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>>): Promise<EmployeeEntity>;
  delete(id: string, companyId: string): Promise<EmployeeEntity>;
}
