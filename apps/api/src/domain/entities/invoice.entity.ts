import { NcfType } from '../enums';

export class InvoiceEntity {
  id: string;
  companyId: string;
  clientRnc: string;
  clientName: string;
  ncf: string;
  ncfType: NcfType;
  date: Date;
  amount: number;
  itbis: number;
  paymentMethod: string;
  journalEntryId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
