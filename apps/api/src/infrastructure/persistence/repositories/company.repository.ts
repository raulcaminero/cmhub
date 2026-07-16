import type { Company as PrismaCompany } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ICompanyRepository } from '@domain/repositories/company.repository.interface';
import { CompanyEntity } from '@domain/entities/company.entity';
import { TaxRegime, UserRole } from '@domain/enums';

const mapCompany = (company: PrismaCompany): CompanyEntity => ({
  id: company.id,
  createdAt: company.createdAt,
  updatedAt: company.updatedAt,
  email: company.email,
  name: company.name,
  rnc: company.rnc,
  tradeName: company.tradeName,
  taxRegime: company.taxRegime as TaxRegime,
  address: company.address,
  phone: company.phone,
});

@Injectable()
export class CompanyRepository implements ICompanyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<CompanyEntity | null> {
    const company = await this.prisma.company.findUnique({ where: { id } });
    return company ? mapCompany(company) : null;
  }

  async findByUserId(userId: string): Promise<CompanyEntity[]> {
    const roles = await this.prisma.userCompanyRole.findMany({
      where: { userId },
      include: { company: true },
    });
    return roles.map((r) => mapCompany(r.company));
  }

  async findByRnc(rnc: string): Promise<CompanyEntity | null> {
    const company = await this.prisma.company.findUnique({ where: { rnc } });
    return company ? mapCompany(company) : null;
  }

  async create(data: Omit<CompanyEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<CompanyEntity> {
    const company = await this.prisma.company.create({ data });
    return mapCompany(company);
  }

  async addUserToCompany(companyId: string, userId: string, role: UserRole): Promise<void> {
    await this.prisma.userCompanyRole.create({ data: { companyId, userId, role } });
  }

  async userHasAccess(companyId: string, userId: string): Promise<boolean> {
    const role = await this.prisma.userCompanyRole.findUnique({
      where: { userId_companyId: { userId, companyId } },
    });
    return role !== null;
  }

  async update(id: string, data: Partial<Omit<CompanyEntity, 'id' | 'createdAt' | 'updatedAt'>>): Promise<CompanyEntity> {
    const company = await this.prisma.company.update({ where: { id }, data });
    return mapCompany(company);
  }
}
