import { Controller, Get, Post, Patch, Body, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { AccountingService } from '@application/services/accounting/accounting.service';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { CreateAccountDto } from '@application/dtos/accounting/create-account.dto';
import { CreateJournalEntryDto } from '@application/dtos/accounting/create-journal-entry.dto';
import { GetAccountsDto } from '@application/dtos/accounting/get-accounts.dto';

import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('accounting')
@ApiBearerAuth()
@Controller('companies/:companyId/accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('accounts')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000) // 5 minutes cache in ms
  @ApiOperation({ summary: 'List chart of accounts' })
  getAccounts(@Param('companyId') companyId: string, @Query() filters: GetAccountsDto) {
    return this.accountingService.getAccounts(companyId, filters);
  }

  @Roles(UserRole.ADMIN, UserRole.CONTADOR)
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

  @Roles(UserRole.ADMIN, UserRole.CONTADOR)
  @Post('journal-entries')
  @ApiOperation({ summary: 'Create a journal entry (double-entry)' })
  createJournalEntry(
    @Param('companyId') companyId: string,
    @Body() dto: CreateJournalEntryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.accountingService.createJournalEntry(companyId, dto, user.userId);
  }

  @Roles(UserRole.ADMIN, UserRole.CONTADOR)
  @Patch('journal-entries/:id/post')
  @ApiOperation({ summary: 'Post/approve a journal entry' })
  postJournalEntry(@Param('companyId') companyId: string, @Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.accountingService.postJournalEntry(companyId, id, user.userId);
  }

  @Roles(UserRole.ADMIN, UserRole.CONTADOR)
  @Patch('journal-entries/:id/void')
  @ApiOperation({ summary: 'Void a journal entry' })
  voidJournalEntry(@Param('companyId') companyId: string, @Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.accountingService.voidJournalEntry(companyId, id, user.userId);
  }

  @Get('period-lock')
  @ApiOperation({ summary: 'Get accounting period lock date' })
  getPeriodLock(@Param('companyId') companyId: string) {
    return this.accountingService.getPeriodLock(companyId);
  }

  @Roles(UserRole.ADMIN)
  @Post('period-lock')
  @ApiOperation({ summary: 'Update accounting period lock date' })
  updatePeriodLock(
    @Param('companyId') companyId: string,
    @Body() body: { lockDate: string | null },
  ) {
    return this.accountingService.updatePeriodLock(companyId, body.lockDate);
  }
}
