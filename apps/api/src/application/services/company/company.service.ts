import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { ICompanyRepository } from '@domain/repositories/company.repository.interface';
import { IAccountRepository } from '@domain/repositories/account.repository.interface';
import { CreateCompanyDto } from '../../dtos/company/create-company.dto';
import { UpdateCompanyDto } from '../../dtos/company/update-company.dto';
import { TaxRegime, UserRole, AccountType } from '@domain/enums';
import { ACCOUNT_REPOSITORY } from '../accounting/accounting.service';

export const COMPANY_REPOSITORY = 'COMPANY_REPOSITORY';

@Injectable()
export class CompanyService {
  constructor(
    @Inject(COMPANY_REPOSITORY) private readonly companyRepository: ICompanyRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
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
    
    // Seed standard chart of accounts
    await this.seedStandardAccounts(company.id);

    return company;
  }

  private async seedStandardAccounts(companyId: string) {
    const asset = await this.accountRepository.create({
      companyId,
      code: '1',
      name: 'Activos',
      type: AccountType.ASSET,
      parentId: null,
      isActive: true,
    });

    const currentAsset = await this.accountRepository.create({
      companyId,
      code: '11',
      name: 'Activos Corrientes',
      type: AccountType.ASSET,
      parentId: asset.id,
      isActive: true,
    });

    await this.accountRepository.create({
      companyId,
      code: '1101',
      name: 'Efectivo en Caja y Bancos',
      type: AccountType.ASSET,
      parentId: currentAsset.id,
      isActive: true,
    });

    await this.accountRepository.create({
      companyId,
      code: '1102',
      name: 'Cuentas por Cobrar',
      type: AccountType.ASSET,
      parentId: currentAsset.id,
      isActive: true,
    });

    await this.accountRepository.create({
      companyId,
      code: '1103',
      name: 'Inventarios',
      type: AccountType.ASSET,
      parentId: currentAsset.id,
      isActive: true,
    });

    const fixedAsset = await this.accountRepository.create({
      companyId,
      code: '12',
      name: 'Propiedad, Planta y Equipos',
      type: AccountType.ASSET,
      parentId: asset.id,
      isActive: true,
    });

    await this.accountRepository.create({
      companyId,
      code: '1201',
      name: 'Terrenos',
      type: AccountType.ASSET,
      parentId: fixedAsset.id,
      isActive: true,
    });

    await this.accountRepository.create({
      companyId,
      code: '1202',
      name: 'Edificaciones',
      type: AccountType.ASSET,
      parentId: fixedAsset.id,
      isActive: true,
    });

    await this.accountRepository.create({
      companyId,
      code: '1203',
      name: 'Equipos de Computación y Transporte',
      type: AccountType.ASSET,
      parentId: fixedAsset.id,
      isActive: true,
    });

    // Pasivos
    const liability = await this.accountRepository.create({
      companyId,
      code: '2',
      name: 'Pasivos',
      type: AccountType.LIABILITY,
      parentId: null,
      isActive: true,
    });

    const currentLiability = await this.accountRepository.create({
      companyId,
      code: '21',
      name: 'Pasivos Corrientes',
      type: AccountType.LIABILITY,
      parentId: liability.id,
      isActive: true,
    });

    await this.accountRepository.create({
      companyId,
      code: '2101',
      name: 'Cuentas por Pagar Proveedores',
      type: AccountType.LIABILITY,
      parentId: currentLiability.id,
      isActive: true,
    });

    await this.accountRepository.create({
      companyId,
      code: '2102',
      name: 'ITBIS por Pagar',
      type: AccountType.LIABILITY,
      parentId: currentLiability.id,
      isActive: true,
    });

    await this.accountRepository.create({
      companyId,
      code: '2103',
      name: 'Retenciones por Pagar',
      type: AccountType.LIABILITY,
      parentId: currentLiability.id,
      isActive: true,
    });

    const longLiability = await this.accountRepository.create({
      companyId,
      code: '22',
      name: 'Pasivos de Largo Plazo',
      type: AccountType.LIABILITY,
      parentId: liability.id,
      isActive: true,
    });

    await this.accountRepository.create({
      companyId,
      code: '2201',
      name: 'Préstamos Bancarios por Pagar',
      type: AccountType.LIABILITY,
      parentId: longLiability.id,
      isActive: true,
    });

    // Patrimonio
    const equity = await this.accountRepository.create({
      companyId,
      code: '3',
      name: 'Patrimonio',
      type: AccountType.EQUITY,
      parentId: null,
      isActive: true,
    });

    await this.accountRepository.create({
      companyId,
      code: '3101',
      name: 'Capital Social',
      type: AccountType.EQUITY,
      parentId: equity.id,
      isActive: true,
    });

    await this.accountRepository.create({
      companyId,
      code: '3102',
      name: 'Resultados Acumulados',
      type: AccountType.EQUITY,
      parentId: equity.id,
      isActive: true,
    });

    // Ingresos
    const revenue = await this.accountRepository.create({
      companyId,
      code: '4',
      name: 'Ingresos',
      type: AccountType.REVENUE,
      parentId: null,
      isActive: true,
    });

    await this.accountRepository.create({
      companyId,
      code: '4101',
      name: 'Ventas de Mercancías',
      type: AccountType.REVENUE,
      parentId: revenue.id,
      isActive: true,
    });

    await this.accountRepository.create({
      companyId,
      code: '4102',
      name: 'Ingresos por Servicios',
      type: AccountType.REVENUE,
      parentId: revenue.id,
      isActive: true,
    });

    // Gastos
    const expense = await this.accountRepository.create({
      companyId,
      code: '6',
      name: 'Gastos',
      type: AccountType.EXPENSE,
      parentId: null,
      isActive: true,
    });

    await this.accountRepository.create({
      companyId,
      code: '6101',
      name: 'Gastos de Personal',
      type: AccountType.EXPENSE,
      parentId: expense.id,
      isActive: true,
    });

    await this.accountRepository.create({
      companyId,
      code: '6102',
      name: 'Gastos de Alquileres',
      type: AccountType.EXPENSE,
      parentId: expense.id,
      isActive: true,
    });

    await this.accountRepository.create({
      companyId,
      code: '6103',
      name: 'Gastos de Servicios Públicos',
      type: AccountType.EXPENSE,
      parentId: expense.id,
      isActive: true,
    });

    await this.accountRepository.create({
      companyId,
      code: '6104',
      name: 'Gastos de Seguros',
      type: AccountType.EXPENSE,
      parentId: expense.id,
      isActive: true,
    });

    await this.accountRepository.create({
      companyId,
      code: '6105',
      name: 'Gastos Diversos',
      type: AccountType.EXPENSE,
      parentId: expense.id,
      isActive: true,
    });
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

  async update(companyId: string, dto: UpdateCompanyDto, userId: string) {
    const hasAccess = await this.companyRepository.userHasAccess(companyId, userId);
    if (!hasAccess) throw new ForbiddenException('Access denied to this company');

    const company = await this.companyRepository.findById(companyId);
    if (!company) throw new NotFoundException('Company not found');

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.tradeName !== undefined) updateData.tradeName = dto.tradeName;
    if (dto.taxRegime !== undefined) updateData.taxRegime = dto.taxRegime;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.email !== undefined) updateData.email = dto.email;

    if (dto.rnc !== undefined && dto.rnc !== company.rnc) {
      const existing = await this.companyRepository.findByRnc(dto.rnc);
      if (existing) throw new ConflictException('A company with this RNC already exists');
      updateData.rnc = dto.rnc;
    }

    return this.companyRepository.update(companyId, updateData);
  }
}
