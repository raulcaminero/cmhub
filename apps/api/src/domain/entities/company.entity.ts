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
  country: string;
  currency: string;
  locale: string;
  enabledModules: string[];
  createdAt: Date;
  updatedAt: Date;
}
