import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { IEmployeeRepository } from '@domain/repositories/employee.repository.interface';
import { CreateEmployeeDto } from '@application/dtos/employee/create-employee.dto';
import { EmployeeEntity } from '@domain/entities/employee.entity';
import { Inject } from '@nestjs/common';
import { EMPLOYEE_REPOSITORY } from '@application/services/payroll/payroll.service';

@ApiTags('employees')
@ApiBearerAuth()
@Controller('companies/:companyId/accounting/employees')
export class EmployeesController {
  constructor(
    @Inject(EMPLOYEE_REPOSITORY) private readonly employeeRepository: IEmployeeRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all employees' })
  getEmployees(@Param('companyId') companyId: string) {
    return this.employeeRepository.findByCompany(companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new employee' })
  createEmployee(@Param('companyId') companyId: string, @Body() dto: CreateEmployeeDto) {
    return this.employeeRepository.create({
      companyId,
      cedula: dto.cedula,
      name: dto.name,
      salary: dto.salary,
      jobTitle: dto.jobTitle ?? null,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an employee' })
  deleteEmployee(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.employeeRepository.delete(id, companyId);
  }
}
