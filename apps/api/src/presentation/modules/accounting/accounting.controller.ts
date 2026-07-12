import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { AccountingService } from '@application/services/accounting/accounting.service';
import { CreateAccountDto } from '@application/dtos/accounting/create-account.dto';
import { CreateJournalEntryDto } from '@application/dtos/accounting/create-journal-entry.dto';
import { GetAccountsDto } from '@application/dtos/accounting/get-accounts.dto';

@ApiTags('accounting')
@ApiBearerAuth()
@Controller('companies/:companyId/accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('accounts')
  @ApiOperation({ summary: 'List chart of accounts' })
  getAccounts(@Param('companyId') companyId: string, @Query() filters: GetAccountsDto) {
    return this.accountingService.getAccounts(companyId, filters);
  }

  @Post('accounts')
  @ApiOperation({ summary: 'Create a new account' })
  createAccount(@Param('companyId') companyId: string, @Body() dto: CreateAccountDto) {
    return this.accountingService.createAccount(companyId, dto);
  }

  @Get('journal-entries')
  @ApiOperation({ summary: 'List journal entries' })
  getJournalEntries(@Param('companyId') companyId: string) {
    return this.accountingService.getJournalEntries(companyId);
  }

  @Post('journal-entries')
  @ApiOperation({ summary: 'Create a journal entry (double-entry)' })
  createJournalEntry(@Param('companyId') companyId: string, @Body() dto: CreateJournalEntryDto) {
    return this.accountingService.createJournalEntry(companyId, dto);
  }
}
