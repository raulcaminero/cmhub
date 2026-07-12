import { TaxRegime } from '../enums';

export class CompanyEntity {
  id: string;
  name: string;
  rnc: string;
  tradeName: string | null;
  taxRegime: TaxRegime;
  address: string | null;
  phone: string | null;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}
