import { InvoiceEntity } from '../entities/invoice.entity';

export interface IInvoiceRepository {
  findById(id: string, companyId: string): Promise<InvoiceEntity | null>;
  findByCompany(companyId: string): Promise<InvoiceEntity[]>;
  create(data: Omit<InvoiceEntity, 'id' | 'createdAt' | 'updatedAt'>, tx?: any): Promise<InvoiceEntity>;
  update(id: string, companyId: string, data: Partial<InvoiceEntity>, tx?: any): Promise<InvoiceEntity>;
}
