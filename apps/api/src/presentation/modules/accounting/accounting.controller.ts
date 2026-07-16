import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
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

  @Patch('journal-entries/:id/post')
  @ApiOperation({ summary: 'Post/approve a journal entry' })
  postJournalEntry(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.accountingService.postJournalEntry(companyId, id);
  }

  @Patch('journal-entries/:id/void')
  @ApiOperation({ summary: 'Void a journal entry' })
  voidJournalEntry(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.accountingService.voidJournalEntry(companyId, id);
  }

  @Get('period-lock')
  @ApiOperation({ summary: 'Get accounting period lock date' })
  getPeriodLock(@Param('companyId') companyId: string) {
    return this.accountingService.getPeriodLock(companyId);
  }

  @Post('period-lock')
  @ApiOperation({ summary: 'Update accounting period lock date' })
  updatePeriodLock(
    @Param('companyId') companyId: string,
    @Body() body: { lockDate: string | null },
  ) {
    return this.accountingService.updatePeriodLock(companyId, body.lockDate);
  }
}
