import type { Invoice as PrismaInvoice } from '@prisma/client';
import { Injectable } from '@nestjs/common';
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
  amount: Number(invoice.amount),
  itbis: Number(invoice.itbis),
  paymentMethod: invoice.paymentMethod,
  journalEntryId: invoice.journalEntryId,
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

  async create(data: Omit<InvoiceEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<InvoiceEntity> {
    const invoice = await this.prisma.invoice.create({
      data: {
        companyId: data.companyId,
        clientRnc: data.clientRnc,
        clientName: data.clientName,
        ncf: data.ncf,
        ncfType: data.ncfType,
        date: data.date,
        amount: data.amount,
        itbis: data.itbis,
        paymentMethod: data.paymentMethod,
        journalEntryId: data.journalEntryId,
      },
    });
    return mapInvoice(invoice);
  }
}
