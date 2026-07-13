import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { INcfSequenceRepository } from '@domain/repositories/ncf-sequence.repository.interface';
import { CreateNcfSequenceDto } from '../../dtos/ncf/create-ncf-sequence.dto';
import { NcfType } from '@domain/enums';

export const NCF_SEQUENCE_REPOSITORY = 'NCF_SEQUENCE_REPOSITORY';

@Injectable()
export class NcfSequenceService {
  constructor(
    @Inject(NCF_SEQUENCE_REPOSITORY) private readonly ncfSequenceRepository: INcfSequenceRepository,
  ) {}

  async getSequences(companyId: string) {
    return this.ncfSequenceRepository.findByCompany(companyId);
  }

  async createSequence(companyId: string, dto: CreateNcfSequenceDto) {
    const existing = await this.ncfSequenceRepository.findByType(companyId, dto.type);
    if (existing) {
      throw new BadRequestException(`A sequence for NCF type ${dto.type} already exists for this company`);
    }

    return this.ncfSequenceRepository.create({
      companyId,
      type: dto.type,
      prefix: dto.prefix,
      current: 0,
      max: dto.max,
      isActive: true,
      expiresAt: new Date(dto.expiresAt),
    });
  }

  async generateNextNcf(companyId: string, type: NcfType): Promise<string> {
    const seq = await this.ncfSequenceRepository.findByType(companyId, type);
    if (!seq) {
      throw new BadRequestException(`No active NCF sequence found for type ${type}. Please register it first.`);
    }

    const updatedSeq = await this.ncfSequenceRepository.increment(seq.id, companyId);
    
    // Format NCF
    const isElectronic = type.startsWith('E');
    const series = isElectronic ? 'E' : 'B';
    const typeStr = type.substring(1); // e.g. '01' from 'B01' or '31' from 'E31'
    const seqLength = isElectronic ? 10 : 8;
    const paddedNum = String(updatedSeq.current).padStart(seqLength, '0');

    return `${series}${typeStr}${paddedNum}`;
  }
}
