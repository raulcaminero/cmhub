import { CompanyEntity } from '../entities/company.entity';

export interface ICompanyRepository {
  findById(id: string): Promise<CompanyEntity | null>;
  findByUserId(userId: string): Promise<CompanyEntity[]>;
  findByRnc(rnc: string): Promise<CompanyEntity | null>;
  create(data: Omit<CompanyEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<CompanyEntity>;
  addUserToCompany(companyId: string, userId: string, role: string): Promise<void>;
  userHasAccess(companyId: string, userId: string): Promise<boolean>;
  update(id: string, data: Partial<Omit<CompanyEntity, 'id' | 'createdAt' | 'updatedAt'>>): Promise<CompanyEntity>;
}
