import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { IInvoiceRepository } from '@domain/repositories/invoice.repository.interface';
import { IAccountRepository } from '@domain/repositories/account.repository.interface';
import { IJournalEntryRepository } from '@domain/repositories/journal-entry.repository.interface';
import { CreateInvoiceDto } from '../../dtos/invoice/create-invoice.dto';
import { CollectInvoiceDto } from '../../dtos/invoice/collect-invoice.dto';
import { NcfSequenceService } from '../ncf/ncf-sequence.service';
import { JournalEntryStatus, AccountType, PaymentMethod } from '@domain/enums';
import { PrismaService } from '@infrastructure/persistence/prisma/prisma.service';
import { checkPeriodLock } from '../accounting/period-lock.helper';

import { ContactService } from '../contact/contact.service';
import { ContactType } from '@domain/entities/contact.entity';

export const INVOICE_REPOSITORY = 'INVOICE_REPOSITORY';
export const ACCOUNT_REPOSITORY = 'ACCOUNT_REPOSITORY';
export const JOURNAL_ENTRY_REPOSITORY = 'JOURNAL_ENTRY_REPOSITORY';

@Injectable()
export class InvoiceService {
  constructor(
    @Inject(INVOICE_REPOSITORY) private readonly invoiceRepository: IInvoiceRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    @Inject(JOURNAL_ENTRY_REPOSITORY) private readonly journalEntryRepository: IJournalEntryRepository,
    private readonly ncfSequenceService: NcfSequenceService,
    private readonly contactService: ContactService,
    private readonly prisma: PrismaService,
  ) {}

  async getInvoices(
    companyId: string,
    query?: { page?: number | string; limit?: number | string; startDate?: string; endDate?: string }
  ) {
    const page = Number(query?.page || 1);
    const limit = Number(query?.limit || 50);
    const skip = (page - 1) * limit;

    let startDate = query?.startDate ? new Date(query.startDate) : undefined;
    let endDate = query?.endDate ? new Date(query.endDate) : undefined;

    if (!startDate) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      startDate = thirtyDaysAgo;
    }
    if (!endDate) {
      endDate = new Date();
    }

    const [invoices, totalCount] = await Promise.all([
      this.prisma.invoice.findMany({
        where: {
          companyId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          lines: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({
        where: {
          companyId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
    ]);

    return {
      data: invoices.map((inv) => ({
        id: inv.id,
        companyId: inv.companyId,
        clientRnc: inv.clientRnc,
        clientName: inv.clientName,
        ncf: inv.ncf,
        ncfType: inv.ncfType,
        date: inv.date,
        paymentDate: inv.paymentDate,
        amount: Number(inv.amount),
        itbis: Number(inv.itbis),
        itbisRetained: Number(inv.itbisRetained),
        isrRetained: Number(inv.isrRetained),
        paymentMethod: inv.paymentMethod,
        journalEntryId: inv.journalEntryId,
        isVoided: inv.isVoided,
        costOfGoodsSold: inv.costOfGoodsSold ? Number(inv.costOfGoodsSold) : null,
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt,
        lines: inv.lines.map((l) => ({
          id: l.id,
          productId: l.productId,
          description: l.description,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          discount: Number(l.discount),
          taxRate: Number(l.taxRate),
          subtotal: Number(l.subtotal),
          itbis: Number(l.itbis),
          total: Number(l.total),
          product: l.product,
        })),
      })),
      totalCount,
      page,
      limit,
    };
  }

  async createInvoice(companyId: string, dto: CreateInvoiceDto, createdByUserId?: string) {
    const [, , accounts] = await Promise.all([
      this.prisma.company.findUnique({
        where: { id: companyId },
        select: { lockDate: true },
      }).then(company => checkPeriodLock(company?.lockDate, new Date())),
      this.contactService.findOrCreateContact(
        companyId,
        dto.clientRnc,
        dto.clientName,
        ContactType.CLIENT,
      ),
      this.accountRepository.findByCompany(companyId),
    ]);

    // Process lines and calculate totals if lines are provided
    let calculatedAmount = 0;
    let calculatedItbis = 0;
    let calculatedCogs = 0;
    const formattedLines: any[] = [];

    if (dto.lines && dto.lines.length > 0) {
      for (const l of dto.lines) {
        const qty = Number(l.quantity) || 1;
        const price = Number(l.unitPrice) || 0;
        const disc = Number(l.discount) || 0;
        const taxRate = l.taxRate !== undefined ? Number(l.taxRate) : 18;
        const cost = l.cost !== undefined && l.cost !== null ? Number(l.cost) * qty : 0;

        const subtotal = qty * price * (1 - disc / 100);
        const lineItbis = subtotal * (taxRate / 100);
        const lineTotal = subtotal + lineItbis;

        calculatedAmount += lineTotal;
        calculatedItbis += lineItbis;
        calculatedCogs += cost;

        formattedLines.push({
          productId: l.productId || null,
          description: l.description,
          quantity: qty,
          unitPrice: price,
          discount: disc,
          taxRate,
          cost: l.cost ?? null,
          subtotal: Number(subtotal.toFixed(2)),
          itbis: Number(lineItbis.toFixed(2)),
          total: Number(lineTotal.toFixed(2)),
        });
      }
    }

    const finalAmount = dto.lines && dto.lines.length > 0 ? Number(calculatedAmount.toFixed(2)) : (dto.amount || 0);
    const finalItbis = dto.lines && dto.lines.length > 0 ? Number(calculatedItbis.toFixed(2)) : (dto.itbis || 0);
    const finalCogs = dto.lines && dto.lines.length > 0 && calculatedCogs > 0 ? Number(calculatedCogs.toFixed(2)) : (dto.costOfGoodsSold || 0);

    return this.prisma.$transaction(async (tx) => {
      // 1. Generate NCF atomically inside transaction
      const ncf = await this.ncfSequenceService.generateNextNcf(companyId, dto.ncfType, tx);

      // Debit Account: Cash/Bank (1101) or Accounts Receivable (1102)
      const isCreditSale = dto.paymentMethod === PaymentMethod.CREDIT;
      let debitAcc: any;

      if (!isCreditSale && dto.bankAccountId) {
        debitAcc = accounts.find((a) => a.id === dto.bankAccountId);
        if (!debitAcc) throw new BadRequestException('La cuenta bancaria seleccionada no es válida.');
      } else {
        const debitCode = isCreditSale ? '1102' : '1101';
        debitAcc = accounts.find((a) => a.code === debitCode);
        if (!debitAcc) {
          debitAcc = accounts.find((a) => a.code.startsWith('1'));
        }
        if (!debitAcc) throw new BadRequestException(`No cash/receivable account found for code ${debitCode}`);
      }

      // Credit Account (Revenue): Ventas de Mercancías (4101)
      let revenueAcc = accounts.find((a) => a.code === '4101');
      if (!revenueAcc) {
        revenueAcc = accounts.find((a) => a.code.startsWith('4'));
      }
      if (!revenueAcc) throw new BadRequestException('No revenue account found in company chart of accounts');

      // Credit Account (ITBIS): ITBIS por Pagar (2102)
      let itbisAcc = accounts.find((a) => a.code === '2102');
      if (!itbisAcc) itbisAcc = accounts.find((a) => a.name.toLowerCase().includes('itbis'));

      // 3. Build double-entry lines
      const journalLines: any[] = [];
      const baseRevenue = finalAmount - finalItbis;

      // DEBIT: Cash / Receivable (Net Amount = Total - Retentions)
      const netReceivable = finalAmount - (dto.itbisRetained ?? 0) - (dto.isrRetained ?? 0);
      journalLines.push({
        accountId: debitAcc.id,
        debit: netReceivable,
        credit: 0,
        description: `Ingreso por venta - NCF ${ncf}`,
      });

      // CREDIT: Sales / Revenue (Net Amount)
      journalLines.push({
        accountId: revenueAcc.id,
        debit: 0,
        credit: baseRevenue,
        description: `Venta base - NCF ${ncf}`,
      });

      // CREDIT: ITBIS charged (if any)
      if (finalItbis > 0) {
        if (!itbisAcc) throw new BadRequestException('No ITBIS liability account found in chart of accounts');
        journalLines.push({
          accountId: itbisAcc.id,
          debit: 0,
          credit: finalItbis,
          description: `ITBIS facturado - NCF ${ncf}`,
        });
      }

      // DEBIT: ITBIS Retained by Client (if any)
      let retentionsAcc = accounts.find((a) => a.code === '2103');
      if (!retentionsAcc) retentionsAcc = accounts.find((a) => a.name.toLowerCase().includes('retencion'));

      if ((dto.itbisRetained ?? 0) > 0) {
        if (!retentionsAcc) throw new BadRequestException('No Retentions account found in chart of accounts');
        journalLines.push({
          accountId: retentionsAcc.id,
          debit: dto.itbisRetained,
          credit: 0,
          description: `ITBIS Retenido por cliente - NCF ${ncf}`,
        });
      }

      // DEBIT: ISR Retained by Client (if any)
      if ((dto.isrRetained ?? 0) > 0) {
        if (!retentionsAcc) throw new BadRequestException('No Retentions account found in chart of accounts');
        journalLines.push({
          accountId: retentionsAcc.id,
          debit: dto.isrRetained,
          credit: 0,
          description: `ISR Retenido por cliente - NCF ${ncf}`,
        });
      }

      // COGS journal lines (if specified)
      if (finalCogs > 0) {
        let cogsAcc = accounts.find((a) => a.code === '6001');
        if (!cogsAcc) cogsAcc = accounts.find((a) => a.code.startsWith('60') || a.code.startsWith('6'));
        if (!cogsAcc) {
          cogsAcc = await this.accountRepository.create({
            companyId,
            code: '6001',
            name: 'Costo de Ventas',
            type: AccountType.EXPENSE,
            parentId: null,
            isActive: true,
          }, tx);
        }

        let invAcc = accounts.find((a) => a.code === '1105');
        if (!invAcc) invAcc = accounts.find((a) => a.code.startsWith('110') && a.code !== '1101' && a.code !== '1102');
        if (!invAcc) {
          invAcc = await this.accountRepository.create({
            companyId,
            code: '1105',
            name: 'Inventario de Mercancías',
            type: AccountType.ASSET,
            parentId: null,
            isActive: true,
          }, tx);
        }

        // DEBIT Costo de Ventas
        journalLines.push({
          accountId: cogsAcc.id,
          debit: finalCogs,
          credit: 0,
          description: `Costo de ventas - NCF ${ncf}`,
        });

        // CREDIT Inventario
        journalLines.push({
          accountId: invAcc.id,
          debit: 0,
          credit: finalCogs,
          description: `Salida de inventario - NCF ${ncf}`,
        });
      }

      const journalEntry = await this.journalEntryRepository.create({
        companyId,
        date: new Date(),
        description: `Factura de venta: ${dto.clientName} - NCF ${ncf}`,
        reference: ncf,
        createdByUserId,
        lines: journalLines,
      }, tx);

      await this.journalEntryRepository.post(journalEntry.id, companyId, tx);

      // 5. Create the Invoice record referencing the JournalEntry
      const invoice = await tx.invoice.create({
        data: {
          companyId,
          clientRnc: dto.clientRnc,
          clientName: dto.clientName,
          ncf,
          ncfType: dto.ncfType,
          date: new Date(),
          amount: finalAmount,
          itbis: finalItbis,
          paymentMethod: dto.paymentMethod,
          journalEntryId: journalEntry.id,
          isVoided: false,
          costOfGoodsSold: finalCogs > 0 ? finalCogs : null,
          itbisRetained: dto.itbisRetained ?? 0,
          isrRetained: dto.isrRetained ?? 0,
          createdByUserId: createdByUserId ?? null,
          ...(formattedLines.length > 0 && {
            lines: {
              create: formattedLines,
            },
          }),
        },
        include: {
          lines: {
            include: {
              product: true,
            },
          },
        },
      });

      if (dto.quotationId) {
        await tx.quotation.update({
          where: { id: dto.quotationId },
          data: {
            status: 'CONVERTED',
            invoiceId: invoice.id,
          },
        });
      }

      return invoice;
    });
  }

  async collectInvoice(companyId: string, id: string, dto: CollectInvoiceDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { lockDate: true },
    });
    checkPeriodLock(company?.lockDate, dto.paymentDate);
    const invoice = await this.invoiceRepository.findById(id, companyId);
    if (!invoice) throw new BadRequestException('Factura no encontrada.');
    if (invoice.paymentMethod !== PaymentMethod.CREDIT) {
      throw new BadRequestException('Solo se pueden cobrar facturas con método de pago a crédito.');
    }
    if (invoice.paymentDate) {
      throw new BadRequestException('Esta factura ya ha sido cobrada.');
    }

    const accounts = await this.accountRepository.findByCompany(companyId);
    
    // Debit Account: Selected Cash/Bank Account (bankAccountId)
    const debitAcc = accounts.find((a) => a.id === dto.bankAccountId);
    if (!debitAcc) throw new BadRequestException('La cuenta bancaria seleccionada no es válida.');

    // Credit Account: Accounts Receivable (1102)
    let creditAcc = accounts.find((a) => a.code === '1102');
    if (!creditAcc) creditAcc = accounts.find((a) => a.code.startsWith('1'));
    if (!creditAcc) throw new BadRequestException('No se encontró cuenta de Cuentas por Cobrar (1102).');

    const netReceivable = Number(invoice.amount) - Number(invoice.itbisRetained || 0) - Number(invoice.isrRetained || 0);

    const journalLines = [
      {
        accountId: debitAcc.id,
        debit: netReceivable,
        credit: 0,
        description: `Cobro de factura - NCF ${invoice.ncf}`,
      },
      {
        accountId: creditAcc.id,
        debit: 0,
        credit: netReceivable,
        description: `Saldar cuenta por cobrar - NCF ${invoice.ncf}`,
      },
    ];

    return this.prisma.$transaction(async (tx) => {
      const journalEntry = await this.journalEntryRepository.create({
        companyId,
        date: new Date(dto.paymentDate),
        description: `Cobro de Factura: ${invoice.clientName} - NCF ${invoice.ncf}`,
        reference: `COBRO-${invoice.ncf}`,
        lines: journalLines,
      }, tx);

      await this.journalEntryRepository.post(journalEntry.id, companyId, tx);

      return this.invoiceRepository.update(id, companyId, {
        paymentDate: new Date(dto.paymentDate),
      }, tx);
    });
  }

  async voidInvoice(companyId: string, id: string) {
    const invoice = await this.invoiceRepository.findById(id, companyId);
    if (!invoice) throw new BadRequestException('Factura no encontrada.');
    if (invoice.isVoided) throw new BadRequestException('Esta factura ya está anulada.');

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { lockDate: true },
    });
    checkPeriodLock(company?.lockDate, invoice.date);

    return this.prisma.$transaction(async (tx) => {
      if (invoice.journalEntryId) {
        await this.journalEntryRepository.void(invoice.journalEntryId, companyId, tx);
      }

      return this.invoiceRepository.update(id, companyId, {
        isVoided: true,
      }, tx);
    });
  }
}
