import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ExpenseService } from '@application/services/expense/expense.service';
import { CreateExpenseDto } from '@application/dtos/expense/create-expense.dto';
import { PayExpenseDto } from '@application/dtos/expense/pay-expense.dto';

@ApiTags('expenses')
@ApiBearerAuth()
@Controller('companies/:companyId/accounting/expenses')
export class ExpensesController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Get()
  @ApiOperation({ summary: 'List all company expenses' })
  getExpenses(@Param('companyId') companyId: string) {
    return this.expenseService.getExpenses(companyId);
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
}
