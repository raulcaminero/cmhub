import { JournalEntryEntity } from '../entities/journal-entry.entity';
import { JournalEntryLineEntity } from '../entities/journal-entry-line.entity';
import { JournalEntryStatus } from '../enums';

export interface CreateJournalEntryData {
  companyId: string;
  date: Date;
  description: string;
  reference?: string;
  lines: Array<Omit<JournalEntryLineEntity, 'id' | 'journalEntryId'>>;
}

export interface JournalEntryFilters {
  startDate?: Date;
  endDate?: Date;
  status?: JournalEntryStatus;
}

export interface IJournalEntryRepository {
  findById(id: string, companyId: string): Promise<JournalEntryEntity | null>;
  findByCompany(companyId: string, filters?: JournalEntryFilters): Promise<JournalEntryEntity[]>;
  create(data: CreateJournalEntryData): Promise<JournalEntryEntity>;
  post(id: string, companyId: string): Promise<JournalEntryEntity>;
  void(id: string, companyId: string): Promise<JournalEntryEntity>;
}
