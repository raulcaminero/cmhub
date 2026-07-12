import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { ICompanyRepository } from '@domain/repositories/company.repository.interface';
import { CreateCompanyDto } from '../../dtos/company/create-company.dto';
import { TaxRegime, UserRole } from '@domain/enums';

export const COMPANY_REPOSITORY = 'COMPANY_REPOSITORY';

@Injectable()
export class CompanyService {
  constructor(
    @Inject(COMPANY_REPOSITORY) private readonly companyRepository: ICompanyRepository,
  ) {}

  async create(dto: CreateCompanyDto, userId: string) {
    const existing = await this.companyRepository.findByRnc(dto.rnc);
    if (existing) throw new ConflictException('A company with this RNC already exists');

    const company = await this.companyRepository.create({
      name: dto.name,
      rnc: dto.rnc,
      tradeName: dto.tradeName ?? null,
      taxRegime: dto.taxRegime ?? TaxRegime.ORDINARIO,
      address: dto.address ?? null,
      phone: dto.phone ?? null,
      email: dto.email ?? null,
    });

    await this.companyRepository.addUserToCompany(company.id, userId, UserRole.ADMIN);
    return company;
  }

  async findAllForUser(userId: string) {
    return this.companyRepository.findByUserId(userId);
  }

  async findOneForUser(companyId: string, userId: string) {
    const hasAccess = await this.companyRepository.userHasAccess(companyId, userId);
    if (!hasAccess) throw new ForbiddenException('Access denied to this company');

    const company = await this.companyRepository.findById(companyId);
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }
}
