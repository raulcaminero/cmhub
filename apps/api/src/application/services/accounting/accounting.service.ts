import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { IAccountRepository } from '@domain/repositories/account.repository.interface';
import { IJournalEntryRepository } from '@domain/repositories/journal-entry.repository.interface';
import { CreateAccountDto } from '../../dtos/accounting/create-account.dto';
import { CreateJournalEntryDto, JournalEntryLineDto } from '../../dtos/accounting/create-journal-entry.dto';
import { GetAccountsDto } from '../../dtos/accounting/get-accounts.dto';
import { PrismaService } from '@infrastructure/persistence/prisma/prisma.service';
import { checkPeriodLock } from './period-lock.helper';

import { AuditLogService } from '../audit/audit-log.service';

export const ACCOUNT_REPOSITORY = 'ACCOUNT_REPOSITORY';
export const JOURNAL_ENTRY_REPOSITORY = 'JOURNAL_ENTRY_REPOSITORY';

@Injectable()
export class AccountingService {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    @Inject(JOURNAL_ENTRY_REPOSITORY) private readonly journalEntryRepository: IJournalEntryRepository,
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getAccounts(companyId: string, filters: GetAccountsDto) {
    return this.accountRepository.findByCompany(companyId, filters);
  }

  async createAccount(companyId: string, dto: CreateAccountDto) {
    const existing = await this.accountRepository.findByCode(dto.code, companyId);
    if (existing) throw new BadRequestException(`Account code ${dto.code} already exists`);

    const account = await this.accountRepository.create({
      companyId,
      code: dto.code,
      name: dto.name,
      type: dto.type,
      parentId: dto.parentId ?? null,
      isActive: true,
    });

    await this.auditLogService.logAction({
      companyId,
      action: 'ACCOUNT_CREATE',
      entity: 'Account',
      entityId: account.id,
      details: { code: account.code, name: account.name, type: account.type },
    });

    return account;
  }

  async getJournalEntries(companyId: string) {
    return this.journalEntryRepository.findByCompany(companyId);
  }

  async createJournalEntry(companyId: string, dto: CreateJournalEntryDto, createdByUserId?: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { lockDate: true },
    });
    checkPeriodLock(company?.lockDate, dto.date);
    this.validateDoubleEntry(dto.lines);

    const entry = await this.journalEntryRepository.create({
      companyId,
      date: new Date(dto.date),
      description: dto.description,
      reference: dto.reference,
      createdByUserId,
      lines: dto.lines.map((l) => ({
        accountId: l.accountId,
        debit: l.debit,
        credit: l.credit,
        description: l.description ?? null,
      })),
    });

    await this.auditLogService.logAction({
      companyId,
      userId: createdByUserId,
      action: 'JOURNAL_CREATE',
      entity: 'JournalEntry',
      entityId: entry.id,
      details: { description: entry.description, reference: entry.reference },
    });

    return entry;
  }

  private validateDoubleEntry(lines: JournalEntryLineDto[]): void {
    const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
    const diff = Math.abs(totalDebit - totalCredit);
    if (diff > 0.001) {
      throw new BadRequestException(
        `Journal entry is not balanced: debit=${totalDebit}, credit=${totalCredit}`,
      );
    }
  }

  async postJournalEntry(companyId: string, id: string, userId?: string) {
    const entry = await this.journalEntryRepository.findById(id, companyId);
    if (!entry) throw new BadRequestException('Asiento no encontrado');
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { lockDate: true },
    });
    checkPeriodLock(company?.lockDate, entry.date);

    const result = await this.journalEntryRepository.post(id, companyId);

    await this.auditLogService.logAction({
      companyId,
      userId,
      action: 'JOURNAL_POST',
      entity: 'JournalEntry',
      entityId: id,
      details: { description: entry.description, reference: entry.reference },
    });

    return result;
  }

  async voidJournalEntry(companyId: string, id: string, userId?: string) {
    const entry = await this.journalEntryRepository.findById(id, companyId);
    if (!entry) throw new BadRequestException('Asiento no encontrado');
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { lockDate: true },
    });
    checkPeriodLock(company?.lockDate, entry.date);

    const result = await this.journalEntryRepository.void(id, companyId);

    await this.auditLogService.logAction({
      companyId,
      userId,
      action: 'JOURNAL_VOID',
      entity: 'JournalEntry',
      entityId: id,
      details: { description: entry.description, reference: entry.reference },
    });

    return result;
  }

  async getPeriodLock(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { lockDate: true },
    });
    return { lockDate: company?.lockDate ?? null };
  }

  async updatePeriodLock(companyId: string, lockDate: string | null) {
    const dateVal = lockDate ? new Date(lockDate) : null;
    const company = await this.prisma.company.update({
      where: { id: companyId },
      data: { lockDate: dateVal },
    });
    return { lockDate: company.lockDate };
  }
}
