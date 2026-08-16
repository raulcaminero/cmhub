import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { INcfSequenceRepository } from '@domain/repositories/ncf-sequence.repository.interface';
import { CreateNcfSequenceDto } from '../../dtos/ncf/create-ncf-sequence.dto';
import { NcfType } from '@domain/enums';
import { PrismaService } from '@infrastructure/persistence/prisma/prisma.service';

import { AuditLogService } from '../audit/audit-log.service';

export const NCF_SEQUENCE_REPOSITORY = 'NCF_SEQUENCE_REPOSITORY';

@Injectable()
export class NcfSequenceService {
  constructor(
    @Inject(NCF_SEQUENCE_REPOSITORY) private readonly ncfSequenceRepository: INcfSequenceRepository,
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getSequences(companyId: string) {
    return this.ncfSequenceRepository.findByCompany(companyId);
  }

  async createSequence(companyId: string, dto: CreateNcfSequenceDto) {
    const existing = await this.ncfSequenceRepository.findByType(companyId, dto.type);
    if (existing) {
      throw new BadRequestException(`A sequence for NCF type ${dto.type} already exists for this company`);
    }

    const seq = await this.ncfSequenceRepository.create({
      companyId,
      type: dto.type,
      prefix: dto.prefix,
      current: 0,
      max: dto.max,
      isActive: true,
      expiresAt: new Date(dto.expiresAt),
    });

    await this.auditLogService.logAction({
      companyId,
      action: 'NCF_SEQUENCE_CREATE',
      entity: 'NcfSequence',
      entityId: seq.id,
      details: { type: dto.type, prefix: dto.prefix, max: dto.max, expiresAt: dto.expiresAt },
    });

    return seq;
  }

  async generateNextNcf(companyId: string, type: NcfType, tx?: any): Promise<string> {
    const seq = await this.ncfSequenceRepository.findByType(companyId, type);
    if (!seq) {
      throw new BadRequestException(`No active NCF sequence found for type ${type}. Please register it first.`);
    }

    if (!seq.isActive) {
      throw new BadRequestException(`La secuencia de NCF tipo ${type} está inactiva.`);
    }

    if (seq.expiresAt && new Date(seq.expiresAt) < new Date()) {
      throw new BadRequestException(
        `La secuencia de NCF tipo ${type} ha vencido (Fecha de vencimiento: ${new Date(seq.expiresAt).toLocaleDateString()}).`
      );
    }

    if (seq.current >= seq.max) {
      throw new BadRequestException(
        `La secuencia de NCF tipo ${type} se ha agotado (Límite máximo alcanzado: ${seq.max}).`
      );
    }

    const updatedSeq = await this.ncfSequenceRepository.increment(seq.id, companyId, tx);

    if (updatedSeq.current > seq.max) {
      throw new BadRequestException(
        `La secuencia de NCF tipo ${type} se ha agotado (Límite máximo alcanzado: ${seq.max}).`
      );
    }
    
    // Format NCF
    const isElectronic = type.startsWith('E');
    const seqLength = isElectronic ? 10 : 8;
    const paddedNum = String(updatedSeq.current).padStart(seqLength, '0');

    return `${seq.prefix}${paddedNum}`;
  }

  async importSequences(companyId: string, dtos: CreateNcfSequenceDto[]) {
    return this.prisma.$transaction(async (tx) => {
      const imported = [];
      for (const dto of dtos) {
        const existing = await this.ncfSequenceRepository.findByType(companyId, dto.type);
        if (existing) {
          continue;
        }
        const seq = await this.ncfSequenceRepository.create({
          companyId,
          type: dto.type,
          prefix: dto.prefix,
          current: 0,
          max: dto.max,
          isActive: true,
          expiresAt: new Date(dto.expiresAt),
        }, tx);
        imported.push(seq);
      }
      return {
        importedCount: imported.length,
        sequences: imported,
      };
    });
  }
}
