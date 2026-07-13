import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { IInvoiceRepository } from '@domain/repositories/invoice.repository.interface';
import { IAccountRepository } from '@domain/repositories/account.repository.interface';
import { IJournalEntryRepository } from '@domain/repositories/journal-entry.repository.interface';
import { CreateInvoiceDto } from '../../dtos/invoice/create-invoice.dto';
import { NcfSequenceService } from '../ncf/ncf-sequence.service';
import { JournalEntryStatus } from '@domain/enums';

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
  ) {}

  async getInvoices(companyId: string) {
    return this.invoiceRepository.findByCompany(companyId);
  }

  async createInvoice(companyId: string, dto: CreateInvoiceDto) {
    // 0. Auto-save client as contact
    await this.contactService.findOrCreateContact(
      companyId,
      dto.clientRnc,
      dto.clientName,
      ContactType.CLIENT,
    );

    // 1. Generate NCF atomically first
    const ncf = await this.ncfSequenceService.generateNextNcf(companyId, dto.ncfType);

    // 2. Resolve accounts
    const accounts = await this.accountRepository.findByCompany(companyId);

    // Debit Account: Cash/Bank (1101) or Accounts Receivable (1102)
    const isCreditSale = dto.paymentMethod === '04'; // 04: Compra/Venta a Crédito
    const debitCode = isCreditSale ? '1102' : '1101';
    let debitAcc = accounts.find((a) => a.code === debitCode);
    if (!debitAcc) {
      debitAcc = accounts.find((a) => a.code.startsWith('1')); // fallback to any asset
    }
    if (!debitAcc) throw new BadRequestException(`No cash/receivable account found for code ${debitCode}`);

    // Credit Account (Revenue): Ventas de Mercancías (4101)
    let revenueAcc = accounts.find((a) => a.code === '4101');
    if (!revenueAcc) {
      revenueAcc = accounts.find((a) => a.code.startsWith('4')); // fallback to any revenue
    }
    if (!revenueAcc) throw new BadRequestException('No revenue account found in company chart of accounts');

    // Credit Account (ITBIS): ITBIS por Pagar (2102)
    let itbisAcc = accounts.find((a) => a.code === '2102');
    if (!itbisAcc) itbisAcc = accounts.find((a) => a.name.toLowerCase().includes('itbis'));

    // 3. Build double-entry lines
    const journalLines: any[] = [];
    const baseRevenue = dto.amount - dto.itbis;

    // DEBIT: Cash / Receivable (Total Amount)
    journalLines.push({
      accountId: debitAcc.id,
      debit: dto.amount,
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
    if (dto.itbis > 0) {
      if (!itbisAcc) throw new BadRequestException('No ITBIS liability account found in chart of accounts');
      journalLines.push({
        accountId: itbisAcc.id,
        debit: 0,
        credit: dto.itbis,
        description: `ITBIS facturado - NCF ${ncf}`,
      });
    }

    // 4. Create Balanced Journal Entry
    const journalEntry = await this.journalEntryRepository.create({
      companyId,
      date: new Date(),
      description: `Factura de venta: ${dto.clientName} - NCF ${ncf}`,
      reference: ncf,
      lines: journalLines,
    });

    await this.journalEntryRepository.post(journalEntry.id, companyId);

    // 5. Create the Invoice record referencing the JournalEntry
    return this.invoiceRepository.create({
      companyId,
      clientRnc: dto.clientRnc,
      clientName: dto.clientName,
      ncf,
      ncfType: dto.ncfType,
      date: new Date(),
      amount: dto.amount,
      itbis: dto.itbis,
      paymentMethod: dto.paymentMethod,
      journalEntryId: journalEntry.id,
    });
  }
}
