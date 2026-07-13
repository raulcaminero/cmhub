export enum ContactType {
  CLIENT = 'CLIENT',
  PROVIDER = 'PROVIDER',
  BOTH = 'BOTH',
}

export class ContactEntity {
  id: string;
  companyId: string;
  rnc: string;
  name: string;
  type: ContactType;
  email: string | null;
  phone: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
}
