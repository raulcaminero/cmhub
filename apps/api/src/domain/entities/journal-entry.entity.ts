import { JournalEntryStatus } from '../enums';
import { JournalEntryLineEntity } from './journal-entry-line.entity';

export class JournalEntryEntity {
  id: string;
  companyId: string;
  date: Date;
  description: string;
  reference: string | null;
  status: JournalEntryStatus;
  lines: JournalEntryLineEntity[];
  createdAt: Date;
  updatedAt: Date;
}
