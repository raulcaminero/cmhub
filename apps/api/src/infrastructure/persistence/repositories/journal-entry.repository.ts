import type { JournalEntry as PrismaJournalEntry, JournalEntryLine as PrismaJournalEntryLine } from '@prisma/client';
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  IJournalEntryRepository,
  CreateJournalEntryData,
  JournalEntryFilters,
} from '@domain/repositories/journal-entry.repository.interface';
import { JournalEntryEntity } from '@domain/entities/journal-entry.entity';
import { JournalEntryStatus } from '@domain/enums';

const mapJournalEntryLine = (line: PrismaJournalEntryLine) => ({
  id: line.id,
  journalEntryId: line.journalEntryId,
  accountId: line.accountId,
  description: line.description,
  debit: Number(line.debit),
  credit: Number(line.credit),
});

const mapJournalEntry = (
  entry: PrismaJournalEntry & { lines: PrismaJournalEntryLine[] },
): JournalEntryEntity => ({
  id: entry.id,
  companyId: entry.companyId,
  date: entry.date,
  description: entry.description,
  reference: entry.reference,
  status: entry.status as JournalEntryStatus,
  lines: entry.lines.map(mapJournalEntryLine),
  createdAt: entry.createdAt,
  updatedAt: entry.updatedAt,
});

@Injectable()
export class JournalEntryRepository implements IJournalEntryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, companyId: string): Promise<JournalEntryEntity | null> {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, companyId },
      include: { lines: true },
    });
    return entry ? mapJournalEntry(entry) : null;
  }

  async findByCompany(companyId: string, filters: JournalEntryFilters = {}): Promise<JournalEntryEntity[]> {
    const entries = await this.prisma.journalEntry.findMany({
      where: {
        companyId,
        ...(filters.startDate && { date: { gte: filters.startDate } }),
        ...(filters.endDate && { date: { lte: filters.endDate } }),
        ...(filters.status && { status: filters.status }),
      },
      include: { lines: true },
      orderBy: { date: 'desc' },
    });
    return entries.map(mapJournalEntry);
  }

  async create(data: CreateJournalEntryData): Promise<JournalEntryEntity> {
    // Validate double entry balance
    const totalDebit = data.lines.reduce((sum, l) => sum + Number(l.debit), 0);
    const totalCredit = data.lines.reduce((sum, l) => sum + Number(l.credit), 0);
    const diff = Math.abs(totalDebit - totalCredit);
    if (diff > 0.001) {
      throw new BadRequestException(
        `El asiento contable no está cuadrado: débito=${totalDebit.toFixed(2)}, crédito=${totalCredit.toFixed(2)}`,
      );
    }

    const entry = await this.prisma.journalEntry.create({
      data: {
        companyId: data.companyId,
        date: data.date,
        description: data.description,
        reference: data.reference,
        lines: { create: data.lines },
      },
      include: { lines: true },
    });
    return mapJournalEntry(entry);
  }

  async post(id: string, companyId: string): Promise<JournalEntryEntity> {
    const entry = await this.prisma.journalEntry.update({
      where: { id, companyId },
      data: { status: JournalEntryStatus.POSTED },
      include: { lines: true },
    });
    return mapJournalEntry(entry);
  }

  async void(id: string, companyId: string): Promise<JournalEntryEntity> {
    const entry = await this.prisma.journalEntry.update({
      where: { id, companyId },
      data: { status: JournalEntryStatus.VOIDED },
      include: { lines: true },
    });
    return mapJournalEntry(entry);
  }
}
