import { Module } from '@nestjs/common';
import { AccountingController } from './accounting.controller';
import {
  AccountingService,
  ACCOUNT_REPOSITORY,
  JOURNAL_ENTRY_REPOSITORY,
} from '@application/services/accounting/accounting.service';
import { AccountRepository } from '@infrastructure/persistence/repositories/account.repository';
import { JournalEntryRepository } from '@infrastructure/persistence/repositories/journal-entry.repository';

@Module({
  controllers: [AccountingController],
  providers: [
    AccountingService,
    { provide: ACCOUNT_REPOSITORY, useClass: AccountRepository },
    { provide: JOURNAL_ENTRY_REPOSITORY, useClass: JournalEntryRepository },
  ],
})
export class AccountingModule {}
