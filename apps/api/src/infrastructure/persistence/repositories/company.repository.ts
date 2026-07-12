import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ICompanyRepository } from '@domain/repositories/company.repository.interface';
import { CompanyEntity } from '@domain/entities/company.entity';
import { UserRole } from '@domain/enums';

@Injectable()
export class CompanyRepository implements ICompanyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<CompanyEntity | null> {
    return this.prisma.company.findUnique({ where: { id } });
  }

  async findByUserId(userId: string): Promise<CompanyEntity[]> {
    const roles = await this.prisma.userCompanyRole.findMany({
      where: { userId },
      include: { company: true },
    });
    return roles.map((r) => r.company);
  }

  async findByRnc(rnc: string): Promise<CompanyEntity | null> {
    return this.prisma.company.findUnique({ where: { rnc } });
  }

  async create(data: Omit<CompanyEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<CompanyEntity> {
    return this.prisma.company.create({ data });
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
}
