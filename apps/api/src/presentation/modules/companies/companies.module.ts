import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller';
import { CompanyService, COMPANY_REPOSITORY } from '@application/services/company/company.service';
import { CompanyRepository } from '@infrastructure/persistence/repositories/company.repository';
import { ACCOUNT_REPOSITORY } from '@application/services/accounting/accounting.service';
import { AccountRepository } from '@infrastructure/persistence/repositories/account.repository';

@Module({
  controllers: [CompaniesController],
  providers: [
    CompanyService,
    { provide: COMPANY_REPOSITORY, useClass: CompanyRepository },
    { provide: ACCOUNT_REPOSITORY, useClass: AccountRepository },
  ],
  exports: [CompanyService],
})
export class CompaniesModule {}
