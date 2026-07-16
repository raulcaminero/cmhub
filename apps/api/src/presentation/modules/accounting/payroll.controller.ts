import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { PayrollService } from '@application/services/payroll/payroll.service';
import { CreatePayrollDto } from '@application/dtos/payroll/create-payroll.dto';

@ApiTags('payroll')
@ApiBearerAuth()
@Controller('companies/:companyId/accounting/payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get()
  @ApiOperation({ summary: 'List all payrolls' })
  getPayrolls(@Param('companyId') companyId: string) {
    return this.payrollService.getPayrolls(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payroll details' })
  getPayrollById(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.payrollService.getPayrollById(companyId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create and process a payroll run' })
  createPayroll(@Param('companyId') companyId: string, @Body() dto: CreatePayrollDto) {
    return this.payrollService.createPayroll(companyId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a payroll run' })
  deletePayroll(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.payrollService.deletePayroll(companyId, id);
  }

  @Post('calculate')
  @ApiOperation({ summary: 'Preview TSS and ISR deductions for a salary' })
  calculateTaxes(@Body() body: { salary: number }) {
    return this.payrollService.calculateTaxes(body.salary);
  }
}
