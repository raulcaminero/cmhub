import { Controller, Get, Post, Body, Param, UseInterceptors, UploadedFile, BadRequestException, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExpenseService } from '@application/services/expense/expense.service';
import { CreateExpenseDto } from '@application/dtos/expense/create-expense.dto';
import { PayExpenseDto } from '@application/dtos/expense/pay-expense.dto';
import { OcrService } from '@application/services/ocr/ocr.service';

@ApiTags('expenses')
@ApiBearerAuth()
@Controller('companies/:companyId/accounting/expenses')
export class ExpensesController {
  constructor(
    private readonly expenseService: ExpenseService,
    private readonly ocrService: OcrService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all company expenses (paginated and filtered by date)' })
  getExpenses(
    @Param('companyId') companyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.expenseService.getExpenses(companyId, { page, limit, startDate, endDate });
  }

  @Post()
  @ApiOperation({ summary: 'Create a new expense and auto-generate journal logs' })
  createExpense(@Param('companyId') companyId: string, @Body() dto: CreateExpenseDto) {
    return this.expenseService.createExpense(companyId, dto);
  }

  @Post(':id/pay')
  @ApiOperation({ summary: 'Record payment of a credit expense' })
  payExpense(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: PayExpenseDto,
  ) {
    return this.expenseService.payExpense(companyId, id, dto);
  }

  @Post(':id/void')
  @ApiOperation({ summary: 'Void an expense and reverse its accounting ledger entry' })
  voidExpense(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.expenseService.voidExpense(companyId, id);
  }

  @Post('import')
  @ApiOperation({ summary: 'Bulk import expenses via JSON array' })
  importExpenses(
    @Param('companyId') companyId: string,
    @Body() dtos: CreateExpenseDto[],
  ) {
    return this.expenseService.importExpenses(companyId, dtos);
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
  @ApiOperation({ summary: 'Scan purchase receipt via OCR' })
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
    return this.ocrService.scanReceipt(file.buffer, file.mimetype);
  }
}
