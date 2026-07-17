import type { Expense as PrismaExpense } from '@prisma/client';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IExpenseRepository } from '@domain/repositories/expense.repository.interface';
import { ExpenseEntity } from '@domain/entities/expense.entity';

const mapExpense = (expense: PrismaExpense): ExpenseEntity => ({
  id: expense.id,
  companyId: expense.companyId,
  providerRnc: expense.providerRnc,
  providerName: expense.providerName,
  ncf: expense.ncf,
  expenseType: expense.expenseType,
  date: expense.date,
  paymentDate: expense.paymentDate,
  amount: Number(expense.amount),
  itbis: Number(expense.itbis),
  itbisRetained: Number(expense.itbisRetained),
  isrRetained: Number(expense.isrRetained),
  paymentMethod: expense.paymentMethod,
  journalEntryId: expense.journalEntryId,
  isVoided: expense.isVoided,
  isForeignPayment: expense.isForeignPayment,
  foreignCountry: expense.foreignCountry,
  foreignTaxId: expense.foreignTaxId,
  foreignPaymentType: expense.foreignPaymentType,
  createdAt: expense.createdAt,
  updatedAt: expense.updatedAt,
});

@Injectable()
export class ExpenseRepository implements IExpenseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, companyId: string): Promise<ExpenseEntity | null> {
    const expense = await this.prisma.expense.findFirst({ where: { id, companyId } });
    return expense ? mapExpense(expense) : null;
  }

  async findByCompany(companyId: string): Promise<ExpenseEntity[]> {
    const expenses = await this.prisma.expense.findMany({
      where: { companyId },
      orderBy: { date: 'desc' },
    });
    return expenses.map(mapExpense);
  }

  async create(data: Omit<ExpenseEntity, 'id' | 'createdAt' | 'updatedAt'>, tx?: any): Promise<ExpenseEntity> {
    const client = tx || this.prisma;
    const expense = await client.expense.create({
      data: {
        companyId: data.companyId,
        providerRnc: data.providerRnc,
        providerName: data.providerName,
        ncf: data.ncf,
        expenseType: data.expenseType,
        date: data.date,
        paymentDate: data.paymentDate,
        amount: data.amount,
        itbis: data.itbis,
        itbisRetained: data.itbisRetained,
        isrRetained: data.isrRetained,
        paymentMethod: data.paymentMethod,
        journalEntryId: data.journalEntryId,
      },
    });
    return mapExpense(expense);
  }

  async update(id: string, companyId: string, data: Partial<ExpenseEntity>, tx?: any): Promise<ExpenseEntity> {
    const client = tx || this.prisma;
    const existing = await client.expense.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) {
      throw new NotFoundException('Gasto no encontrado o acceso denegado.');
    }
    const expense = await client.expense.update({
      where: { id },
      data: {
        providerRnc: data.providerRnc,
        providerName: data.providerName,
        date: data.date,
        paymentDate: data.paymentDate,
        amount: data.amount,
        itbis: data.itbis,
        paymentMethod: data.paymentMethod,
        itbisRetained: data.itbisRetained,
        isrRetained: data.isrRetained,
      },
    });
    return mapExpense(expense);
  }

  async delete(id: string, companyId: string, tx?: any): Promise<ExpenseEntity> {
    const client = tx || this.prisma;
    const existing = await client.expense.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) {
      throw new NotFoundException('Gasto no encontrado o acceso denegado.');
    }
    const expense = await client.expense.delete({
      where: { id },
    });

    if (expense.journalEntryId) {
      try {
        await client.journalEntry.delete({
          where: { id: expense.journalEntryId },
        });
      } catch (e) {
        try {
          await client.journalEntry.update({
            where: { id: expense.journalEntryId },
            data: { status: 'VOIDED' },
          });
        } catch (voidError) {
          throw new BadRequestException('No se pudo eliminar ni anular el asiento contable asociado al gasto.');
        }
      }
    }

    return mapExpense(expense);
  }
}
