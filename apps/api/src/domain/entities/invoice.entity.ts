import { NcfType } from '../enums';

export class InvoiceEntity {
  id: string;
  companyId: string;
  clientRnc: string;
  clientName: string;
  ncf: string;
  ncfType: NcfType;
  date: Date;
  paymentDate?: Date | null;
  amount: number;
  itbis: number;
  paymentMethod: string;
  journalEntryId: string | null;
  isVoided: boolean;
  createdAt: Date;
  updatedAt: Date;
}
