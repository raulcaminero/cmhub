import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IEmployeeRepository } from '@domain/repositories/employee.repository.interface';
import { EmployeeEntity } from '@domain/entities/employee.entity';
import type { Employee as PrismaEmployee } from '@prisma/client';

const mapEmployee = (emp: PrismaEmployee): EmployeeEntity => ({
  id: emp.id,
  companyId: emp.companyId,
  cedula: emp.cedula,
  name: emp.name,
  salary: Number(emp.salary),
  jobTitle: emp.jobTitle,
  createdAt: emp.createdAt,
  updatedAt: emp.updatedAt,
});

@Injectable()
export class EmployeeRepository implements IEmployeeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, companyId: string): Promise<EmployeeEntity | null> {
    const emp = await this.prisma.employee.findFirst({ where: { id, companyId } });
    return emp ? mapEmployee(emp) : null;
  }

  async findByCedula(companyId: string, cedula: string): Promise<EmployeeEntity | null> {
    const emp = await this.prisma.employee.findUnique({
      where: { companyId_cedula: { companyId, cedula } },
    });
    return emp ? mapEmployee(emp) : null;
  }

  async findByCompany(companyId: string): Promise<EmployeeEntity[]> {
    const emps = await this.prisma.employee.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
    return emps.map(mapEmployee);
  }

  async create(data: Omit<EmployeeEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmployeeEntity> {
    const emp = await this.prisma.employee.create({
      data: {
        companyId: data.companyId,
        cedula: data.cedula,
        name: data.name,
        salary: data.salary,
        jobTitle: data.jobTitle,
      },
    });
    return mapEmployee(emp);
  }

  async update(
    id: string,
    companyId: string,
    data: Partial<Omit<EmployeeEntity, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<EmployeeEntity> {
    const emp = await this.prisma.employee.update({
      where: { id },
      data: {
        cedula: data.cedula,
        name: data.name,
        salary: data.salary,
        jobTitle: data.jobTitle,
      },
    });
    return mapEmployee(emp);
  }

  async delete(id: string, companyId: string): Promise<EmployeeEntity> {
    const emp = await this.prisma.employee.delete({
      where: { id },
    });
    return mapEmployee(emp);
  }
}
