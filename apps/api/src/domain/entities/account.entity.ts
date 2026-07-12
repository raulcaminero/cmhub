import { AccountType } from '../enums';

export class AccountEntity {
  id: string;
  companyId: string;
  code: string;
  name: string;
  type: AccountType;
  parentId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
