import { AccountEntity } from '../entities/account.entity';
import { AccountType } from '../enums';

export interface AccountFilters {
  type?: AccountType;
  isActive?: boolean;
  parentId?: string | null;
}

export interface IAccountRepository {
  findById(id: string, companyId: string): Promise<AccountEntity | null>;
  findByCompany(companyId: string, filters?: AccountFilters): Promise<AccountEntity[]>;
  findByCode(code: string, companyId: string): Promise<AccountEntity | null>;
  create(data: Omit<AccountEntity, 'id' | 'createdAt' | 'updatedAt'>, tx?: any): Promise<AccountEntity>;
  update(id: string, companyId: string, data: Partial<AccountEntity>, tx?: any): Promise<AccountEntity>;
}
