import type { Account as PrismaAccount } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IAccountRepository, AccountFilters } from '@domain/repositories/account.repository.interface';
import { AccountEntity } from '@domain/entities/account.entity';
import { AccountType } from '@domain/enums';

const mapAccount = (account: PrismaAccount): AccountEntity => ({
  id: account.id,
  createdAt: account.createdAt,
  updatedAt: account.updatedAt,
  type: account.type as AccountType,
  name: account.name,
  companyId: account.companyId,
  code: account.code,
  parentId: account.parentId,
  isActive: account.isActive,
});

@Injectable()
export class AccountRepository implements IAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, companyId: string): Promise<AccountEntity | null> {
    const account = await this.prisma.account.findFirst({ where: { id, companyId } });
    return account ? mapAccount(account) : null;
  }

  async findByCompany(companyId: string, filters: AccountFilters = {}): Promise<AccountEntity[]> {
    const accounts = await this.prisma.account.findMany({
      where: { companyId, ...filters },
      orderBy: { code: 'asc' },
    });
    return accounts.map(mapAccount);
  }

  async findByCode(code: string, companyId: string): Promise<AccountEntity | null> {
    const account = await this.prisma.account.findUnique({ where: { companyId_code: { companyId, code } } });
    return account ? mapAccount(account) : null;
  }

  async create(data: Omit<AccountEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<AccountEntity> {
    const account = await this.prisma.account.create({ data });
    return mapAccount(account);
  }

  async update(id: string, companyId: string, data: Partial<AccountEntity>): Promise<AccountEntity> {
    const account = await this.prisma.account.update({ where: { id }, data });
    return mapAccount(account);
  }
}
