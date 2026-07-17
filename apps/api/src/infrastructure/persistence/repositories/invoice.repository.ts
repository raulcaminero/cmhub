import type { Invoice as PrismaInvoice } from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IInvoiceRepository } from '@domain/repositories/invoice.repository.interface';
import { InvoiceEntity } from '@domain/entities/invoice.entity';
import { NcfType } from '@domain/enums';

const mapInvoice = (invoice: PrismaInvoice): InvoiceEntity => ({
  id: invoice.id,
  companyId: invoice.companyId,
  clientRnc: invoice.clientRnc,
  clientName: invoice.clientName,
  ncf: invoice.ncf,
  ncfType: invoice.ncfType as NcfType,
  date: invoice.date,
  paymentDate: invoice.paymentDate,
  amount: Number(invoice.amount),
  itbis: Number(invoice.itbis),
  paymentMethod: invoice.paymentMethod,
  journalEntryId: invoice.journalEntryId,
  isVoided: invoice.isVoided,
  itbisRetained: Number(invoice.itbisRetained),
  isrRetained: Number(invoice.isrRetained),
  costOfGoodsSold: invoice.costOfGoodsSold ? Number(invoice.costOfGoodsSold) : null,
  createdAt: invoice.createdAt,
  updatedAt: invoice.updatedAt,
});

@Injectable()
export class InvoiceRepository implements IInvoiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, companyId: string): Promise<InvoiceEntity | null> {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, companyId } });
    return invoice ? mapInvoice(invoice) : null;
  }

  async findByCompany(companyId: string): Promise<InvoiceEntity[]> {
    const invoices = await this.prisma.invoice.findMany({
      where: { companyId },
      orderBy: { date: 'desc' },
    });
    return invoices.map(mapInvoice);
  }

  async create(data: Omit<InvoiceEntity, 'id' | 'createdAt' | 'updatedAt'>, tx?: any): Promise<InvoiceEntity> {
    const client = tx || this.prisma;
    const invoice = await client.invoice.create({
      data: {
        companyId: data.companyId,
        clientRnc: data.clientRnc,
        clientName: data.clientName,
        ncf: data.ncf,
        ncfType: data.ncfType,
        date: data.date,
        paymentDate: data.paymentDate,
        amount: data.amount,
        itbis: data.itbis,
        paymentMethod: data.paymentMethod,
        journalEntryId: data.journalEntryId,
        itbisRetained: data.itbisRetained ?? 0,
        isrRetained: data.isrRetained ?? 0,
      },
    });
    return mapInvoice(invoice);
  }

  async update(id: string, companyId: string, data: Partial<InvoiceEntity>, tx?: any): Promise<InvoiceEntity> {
    const client = tx || this.prisma;
    const existing = await client.invoice.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) {
      throw new NotFoundException('Factura no encontrada o acceso denegado.');
    }
    const invoice = await client.invoice.update({
      where: { id },
      data: {
        clientRnc: data.clientRnc,
        clientName: data.clientName,
        ncf: data.ncf,
        ncfType: data.ncfType,
        date: data.date,
        paymentDate: data.paymentDate,
        amount: data.amount,
        itbis: data.itbis,
        paymentMethod: data.paymentMethod,
        journalEntryId: data.journalEntryId,
        itbisRetained: data.itbisRetained,
        isrRetained: data.isrRetained,
      },
    });
    return mapInvoice(invoice);
  }
}
