import { NcfType } from '../enums';

export class NcfSequenceEntity {
  id: string;
  companyId: string;
  type: NcfType;
  prefix: string;
  current: number;
  max: number;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
