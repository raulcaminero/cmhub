import type { NcfSequence as PrismaNcfSequence } from '@prisma/client';
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { INcfSequenceRepository } from '@domain/repositories/ncf-sequence.repository.interface';
import { NcfSequenceEntity } from '@domain/entities/ncf-sequence.entity';
import { NcfType } from '@domain/enums';

const mapNcfSequence = (seq: PrismaNcfSequence): NcfSequenceEntity => ({
  id: seq.id,
  companyId: seq.companyId,
  type: seq.type as NcfType,
  prefix: seq.prefix,
  current: seq.current,
  max: seq.max,
  isActive: seq.isActive,
  expiresAt: seq.expiresAt,
  createdAt: seq.createdAt,
  updatedAt: seq.updatedAt,
});

@Injectable()
export class NcfSequenceRepository implements INcfSequenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, companyId: string): Promise<NcfSequenceEntity | null> {
    const seq = await this.prisma.ncfSequence.findFirst({ where: { id, companyId } });
    return seq ? mapNcfSequence(seq) : null;
  }

  async findByCompany(companyId: string): Promise<NcfSequenceEntity[]> {
    const seqs = await this.prisma.ncfSequence.findMany({
      where: { companyId },
      orderBy: { type: 'asc' },
    });
    return seqs.map(mapNcfSequence);
  }

  async findByType(companyId: string, type: NcfType): Promise<NcfSequenceEntity | null> {
    const seq = await this.prisma.ncfSequence.findUnique({
      where: { companyId_type: { companyId, type } },
    });
    return seq ? mapNcfSequence(seq) : null;
  }

  async create(data: Omit<NcfSequenceEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<NcfSequenceEntity> {
    const seq = await this.prisma.ncfSequence.create({ data });
    return mapNcfSequence(seq);
  }

  async update(id: string, companyId: string, data: Partial<NcfSequenceEntity>): Promise<NcfSequenceEntity> {
    const seq = await this.prisma.ncfSequence.update({ where: { id }, data });
    return mapNcfSequence(seq);
  }

  async increment(id: string, companyId: string): Promise<NcfSequenceEntity> {
    const seq = await this.prisma.ncfSequence.findFirst({ where: { id, companyId } });
    if (!seq) throw new BadRequestException('NCF Sequence not found');
    if (seq.current >= seq.max) throw new BadRequestException(`NCF Sequence ${seq.type} has reached its maximum limit (${seq.max})`);
    if (!seq.isActive) throw new BadRequestException(`NCF Sequence ${seq.type} is not active`);
    if (new Date(seq.expiresAt) < new Date()) throw new BadRequestException(`NCF Sequence ${seq.type} has expired`);

    const updated = await this.prisma.ncfSequence.update({
      where: { id },
      data: { current: { increment: 1 } },
    });
    return mapNcfSequence(updated);
  }
}
