import { AccountType, JournalEntryStatus, NcfType, TaxRegime, UserRole } from './enums';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface Company {
  id: string;
  name: string;
  rnc: string;
  tradeName: string | null;
  taxRegime: TaxRegime;
  address: string | null;
  phone: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  companyId: string;
  code: string;
  name: string;
  type: AccountType;
  parentId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntryLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  debit: number;
  credit: number;
  description: string | null;
}

export interface JournalEntry {
  id: string;
  companyId: string;
  date: string;
  description: string;
  reference: string | null;
  status: JournalEntryStatus;
  lines: JournalEntryLine[];
  createdAt: string;
  updatedAt: string;
}

export interface NcfSequence {
  id: string;
  companyId: string;
  type: NcfType;
  prefix: string;
  current: number;
  max: number;
  isActive: boolean;
  expiresAt: string;
}

export interface UserCompanyRole {
  userId: string;
  companyId: string;
  role: UserRole;
}
