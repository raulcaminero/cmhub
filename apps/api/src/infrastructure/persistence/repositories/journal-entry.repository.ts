import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  IJournalEntryRepository,
  CreateJournalEntryData,
  JournalEntryFilters,
} from '@domain/repositories/journal-entry.repository.interface';
import { JournalEntryEntity } from '@domain/entities/journal-entry.entity';
import { JournalEntryStatus } from '@domain/enums';

@Injectable()
export class JournalEntryRepository implements IJournalEntryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, companyId: string): Promise<JournalEntryEntity | null> {
    return this.prisma.journalEntry.findFirst({
      where: { id, companyId },
      include: { lines: true },
    }) as Promise<JournalEntryEntity | null>;
  }

  async findByCompany(companyId: string, filters: JournalEntryFilters = {}): Promise<JournalEntryEntity[]> {
    return this.prisma.journalEntry.findMany({
      where: {
        companyId,
        ...(filters.startDate && { date: { gte: filters.startDate } }),
        ...(filters.endDate && { date: { lte: filters.endDate } }),
        ...(filters.status && { status: filters.status }),
      },
      include: { lines: true },
      orderBy: { date: 'desc' },
    }) as Promise<JournalEntryEntity[]>;
  }

  async create(data: CreateJournalEntryData): Promise<JournalEntryEntity> {
    return this.prisma.journalEntry.create({
      data: {
        companyId: data.companyId,
        date: data.date,
        description: data.description,
        reference: data.reference,
        lines: { create: data.lines },
      },
      include: { lines: true },
    }) as Promise<JournalEntryEntity>;
  }

  async post(id: string, companyId: string): Promise<JournalEntryEntity> {
    return this.prisma.journalEntry.update({
      where: { id, companyId },
      data: { status: JournalEntryStatus.POSTED },
      include: { lines: true },
    }) as Promise<JournalEntryEntity>;
  }

  async void(id: string, companyId: string): Promise<JournalEntryEntity> {
    return this.prisma.journalEntry.update({
      where: { id, companyId },
      data: { status: JournalEntryStatus.VOIDED },
      include: { lines: true },
    }) as Promise<JournalEntryEntity>;
  }
}
