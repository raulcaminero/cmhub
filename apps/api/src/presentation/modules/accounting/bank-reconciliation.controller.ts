import { Controller, Get, Post, Body, Param, Query, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { BankReconciliationService } from '@application/services/bank-reconciliation/bank-reconciliation.service';
import { ImportCsvDto, AutoMatchDto, ReconcileManuallyDto } from '@application/dtos/reconciliation/reconciliation.dto';

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
    @Body() dto: ImportCsvDto
  ) {
    return this.reconciliationService.importCsvStatement(companyId, dto.accountId, dto.csvContent);
  }

  @Post('auto-match')
  @ApiOperation({ summary: 'Run automatic bank reconciliation matching' })
  autoMatch(
    @Param('companyId') companyId: string,
    @Body() dto: AutoMatchDto
  ) {
    return this.reconciliationService.autoMatch(companyId, dto.accountId);
  }

  @Post('match')
  @ApiOperation({ summary: 'Manually reconcile a bank transaction with a ledger line' })
  reconcileManually(
    @Param('companyId') companyId: string,
    @Body() dto: ReconcileManuallyDto
  ) {
    return this.reconciliationService.reconcileManually(
      companyId,
      dto.bankTransactionId,
      dto.journalEntryLineId
    );
  }

  @Delete('unmatch/:id')
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
