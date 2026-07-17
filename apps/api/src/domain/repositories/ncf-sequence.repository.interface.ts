import { NcfSequenceEntity } from '../entities/ncf-sequence.entity';
import { NcfType } from '../enums';

export interface INcfSequenceRepository {
  findById(id: string, companyId: string): Promise<NcfSequenceEntity | null>;
  findByCompany(companyId: string): Promise<NcfSequenceEntity[]>;
  findByType(companyId: string, type: NcfType): Promise<NcfSequenceEntity | null>;
  create(data: Omit<NcfSequenceEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<NcfSequenceEntity>;
  update(id: string, companyId: string, data: Partial<NcfSequenceEntity>): Promise<NcfSequenceEntity>;
  increment(id: string, companyId: string, tx?: any): Promise<NcfSequenceEntity>;
}
