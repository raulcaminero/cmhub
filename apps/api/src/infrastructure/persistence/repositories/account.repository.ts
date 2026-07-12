import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IAccountRepository, AccountFilters } from '@domain/repositories/account.repository.interface';
import { AccountEntity } from '@domain/entities/account.entity';

@Injectable()
export class AccountRepository implements IAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, companyId: string): Promise<AccountEntity | null> {
    return this.prisma.account.findFirst({ where: { id, companyId } });
  }

  async findByCompany(companyId: string, filters: AccountFilters = {}): Promise<AccountEntity[]> {
    return this.prisma.account.findMany({
      where: { companyId, ...filters },
      orderBy: { code: 'asc' },
    });
  }

  async findByCode(code: string, companyId: string): Promise<AccountEntity | null> {
    return this.prisma.account.findUnique({ where: { companyId_code: { companyId, code } } });
  }

  async create(data: Omit<AccountEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<AccountEntity> {
    return this.prisma.account.create({ data });
  }

  async update(id: string, companyId: string, data: Partial<AccountEntity>): Promise<AccountEntity> {
    return this.prisma.account.update({ where: { id }, data });
  }
}
