import { Module } from '@nestjs/common';
import { AccountingController } from './accounting.controller';
import { ExpensesController } from './expenses.controller';
import { NcfController } from './ncf.controller';
import { ReportsController } from './reports.controller';
import { InvoicesController } from './invoices.controller';
import { ContactsController } from './contacts.controller';
import { EmployeesController } from './employees.controller';
import { PayrollController } from './payroll.controller';
import { BankReconciliationController } from './bank-reconciliation.controller';
import {
  AccountingService,
  ACCOUNT_REPOSITORY,
  JOURNAL_ENTRY_REPOSITORY,
} from '@application/services/accounting/accounting.service';
import { ExpenseService, EXPENSE_REPOSITORY } from '@application/services/expense/expense.service';
import { NcfSequenceService, NCF_SEQUENCE_REPOSITORY } from '@application/services/ncf/ncf-sequence.service';
import { ReportService } from '@application/services/report/report.service';
import { InvoiceService, INVOICE_REPOSITORY } from '@application/services/invoice/invoice.service';
import { ContactService, CONTACT_REPOSITORY } from '@application/services/contact/contact.service';
import {
  PayrollService,
  EMPLOYEE_REPOSITORY,
  PAYROLL_REPOSITORY,
} from '@application/services/payroll/payroll.service';
import {
  BankReconciliationService,
  BANK_TRANSACTION_REPOSITORY,
} from '@application/services/bank-reconciliation/bank-reconciliation.service';

import { AccountRepository } from '@infrastructure/persistence/repositories/account.repository';
import { JournalEntryRepository } from '@infrastructure/persistence/repositories/journal-entry.repository';
import { ExpenseRepository } from '@infrastructure/persistence/repositories/expense.repository';
import { NcfSequenceRepository } from '@infrastructure/persistence/repositories/ncf-sequence.repository';
import { InvoiceRepository } from '@infrastructure/persistence/repositories/invoice.repository';
import { ContactRepository } from '@infrastructure/persistence/repositories/contact.repository';
import { EmployeeRepository } from '@infrastructure/persistence/repositories/employee.repository';
import { PayrollRepository } from '@infrastructure/persistence/repositories/payroll.repository';
import { BankTransactionRepository } from '@infrastructure/persistence/repositories/bank-transaction.repository';

@Module({
  controllers: [
    AccountingController,
    ExpensesController,
    NcfController,
    ReportsController,
    InvoicesController,
    ContactsController,
    EmployeesController,
    PayrollController,
    BankReconciliationController,
  ],
  providers: [
    AccountingService,
    ExpenseService,
    NcfSequenceService,
    ReportService,
    InvoiceService,
    ContactService,
    PayrollService,
    BankReconciliationService,
    { provide: ACCOUNT_REPOSITORY, useClass: AccountRepository },
    { provide: JOURNAL_ENTRY_REPOSITORY, useClass: JournalEntryRepository },
    { provide: EXPENSE_REPOSITORY, useClass: ExpenseRepository },
    { provide: NCF_SEQUENCE_REPOSITORY, useClass: NcfSequenceRepository },
    { provide: INVOICE_REPOSITORY, useClass: InvoiceRepository },
    { provide: CONTACT_REPOSITORY, useClass: ContactRepository },
    { provide: EMPLOYEE_REPOSITORY, useClass: EmployeeRepository },
    { provide: PAYROLL_REPOSITORY, useClass: PayrollRepository },
    { provide: BANK_TRANSACTION_REPOSITORY, useClass: BankTransactionRepository },
  ],
})
export class AccountingModule {}
