import { Controller, Get, Post, Body, Param, Query, Delete, UseInterceptors, UploadedFile, BadRequestException, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { BankReconciliationService } from '@application/services/bank-reconciliation/bank-reconciliation.service';
import { ImportCsvDto, AutoMatchDto, ReconcileManuallyDto } from '@application/dtos/reconciliation/reconciliation.dto';
import { OcrService } from '@application/services/ocr/ocr.service';

@ApiTags('reconciliation')
@ApiBearerAuth()
@Controller('companies/:companyId/accounting/reconciliation')
export class BankReconciliationController {
  constructor(
    private readonly reconciliationService: BankReconciliationService,
    private readonly ocrService: OcrService,
  ) {}

  @Get('transactions')
  @ApiOperation({ summary: 'List all imported bank transactions (paginated and filtered by date)' })
  getTransactions(
    @Param('companyId') companyId: string,
    @Query('accountId') accountId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reconciliationService.getTransactions(companyId, accountId, { page, limit, startDate, endDate });
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

  @Post('import-ocr')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Scan bank statement table via OCR' })
  importOcr(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024, message: 'El archivo excede el límite máximo de 5MB.' }),
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|pdf)' }),
        ],
        fileIsRequired: true,
      }),
    ) file: any,
  ) {
    return this.ocrService.scanBankStatement(file.buffer, file.mimetype);
  }
}
