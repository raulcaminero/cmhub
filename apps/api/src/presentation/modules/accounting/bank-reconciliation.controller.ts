import { Controller, Get, Post, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { BankReconciliationService } from '@application/services/bank-reconciliation/bank-reconciliation.service';

@ApiTags('reconciliation')
@ApiBearerAuth()
@Controller('companies/:companyId/accounting/reconciliation')
export class BankReconciliationController {
  constructor(private readonly reconciliationService: BankReconciliationService) {}

  @Get('transactions')
  @ApiOperation({ summary: 'List all imported bank transactions' })
  getTransactions(
    @Param('companyId') companyId: string,
    @Query('accountId') accountId?: string
  ) {
    return this.reconciliationService.getTransactions(companyId, accountId);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import bank statement CSV' })
  importCsv(
    @Param('companyId') companyId: string,
    @Body() body: { accountId: string; csvContent: string }
  ) {
    if (!body.accountId || !body.csvContent) {
      throw new BadRequestException('Se requieren accountId y csvContent.');
    }
    return this.reconciliationService.importCsvStatement(companyId, body.accountId, body.csvContent);
  }

  @Post('auto-match')
  @ApiOperation({ summary: 'Run automatic bank reconciliation matching' })
  autoMatch(
    @Param('companyId') companyId: string,
    @Body() body: { accountId: string }
  ) {
    if (!body.accountId) {
      throw new BadRequestException('Se requiere accountId.');
    }
    return this.reconciliationService.autoMatch(companyId, body.accountId);
  }

  @Post('match')
  @ApiOperation({ summary: 'Manually reconcile a bank transaction with a ledger line' })
  reconcileManually(
    @Param('companyId') companyId: string,
    @Body() body: { bankTransactionId: string; journalEntryLineId: string }
  ) {
    if (!body.bankTransactionId || !body.journalEntryLineId) {
      throw new BadRequestException('Se requieren bankTransactionId y journalEntryLineId.');
    }
    return this.reconciliationService.reconcileManually(
      companyId,
      body.bankTransactionId,
      body.journalEntryLineId
    );
  }

  @Post('unmatch/:id')
  @ApiOperation({ summary: 'Unreconcile a bank transaction' })
  unreconcile(
    @Param('companyId') companyId: string,
    @Param('id') id: string
  ) {
    return this.reconciliationService.unreconcile(companyId, id);
  }

  @Get('report/:accountId')
  @ApiOperation({ summary: 'Get reconciliation comparison report' })
  getReport(
    @Param('companyId') companyId: string,
    @Param('accountId') accountId: string
  ) {
    return this.reconciliationService.getReconciliationReport(companyId, accountId);
  }
}
