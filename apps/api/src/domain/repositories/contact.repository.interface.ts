import { ContactEntity } from '../entities/contact.entity';

export interface IContactRepository {
  findById(id: string, companyId: string): Promise<ContactEntity | null>;
  findByRnc(companyId: string, rnc: string): Promise<ContactEntity | null>;
  findByCompany(companyId: string): Promise<ContactEntity[]>;
  create(data: Omit<ContactEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContactEntity>;
  update(id: string, companyId: string, data: Partial<Omit<ContactEntity, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>>): Promise<ContactEntity>;
  delete(id: string, companyId: string): Promise<ContactEntity>;
}
