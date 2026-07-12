import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { IAccountRepository } from '@domain/repositories/account.repository.interface';
import { IJournalEntryRepository } from '@domain/repositories/journal-entry.repository.interface';
import { CreateAccountDto } from '../../dtos/accounting/create-account.dto';
import { CreateJournalEntryDto, JournalEntryLineDto } from '../../dtos/accounting/create-journal-entry.dto';
import { GetAccountsDto } from '../../dtos/accounting/get-accounts.dto';

export const ACCOUNT_REPOSITORY = 'ACCOUNT_REPOSITORY';
export const JOURNAL_ENTRY_REPOSITORY = 'JOURNAL_ENTRY_REPOSITORY';

@Injectable()
export class AccountingService {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    @Inject(JOURNAL_ENTRY_REPOSITORY) private readonly journalEntryRepository: IJournalEntryRepository,
  ) {}

  async getAccounts(companyId: string, filters: GetAccountsDto) {
    return this.accountRepository.findByCompany(companyId, filters);
  }

  async createAccount(companyId: string, dto: CreateAccountDto) {
    const existing = await this.accountRepository.findByCode(dto.code, companyId);
    if (existing) throw new BadRequestException(`Account code ${dto.code} already exists`);

    return this.accountRepository.create({
      companyId,
      code: dto.code,
      name: dto.name,
      type: dto.type,
      parentId: dto.parentId ?? null,
      isActive: true,
    });
  }

  async getJournalEntries(companyId: string) {
    return this.journalEntryRepository.findByCompany(companyId);
  }

  async createJournalEntry(companyId: string, dto: CreateJournalEntryDto) {
    this.validateDoubleEntry(dto.lines);

    return this.journalEntryRepository.create({
      companyId,
      date: new Date(dto.date),
      description: dto.description,
      reference: dto.reference,
      lines: dto.lines.map((l) => ({
        accountId: l.accountId,
        debit: l.debit,
        credit: l.credit,
        description: l.description ?? null,
      })),
    });
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
}
