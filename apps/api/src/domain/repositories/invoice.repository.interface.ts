import { InvoiceEntity } from '../entities/invoice.entity';

export interface IInvoiceRepository {
  findById(id: string, companyId: string): Promise<InvoiceEntity | null>;
  findByCompany(companyId: string): Promise<InvoiceEntity[]>;
  create(data: Omit<InvoiceEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<InvoiceEntity>;
}
