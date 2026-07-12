import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller';
import { CompanyService, COMPANY_REPOSITORY } from '@application/services/company/company.service';
import { CompanyRepository } from '@infrastructure/persistence/repositories/company.repository';

@Module({
  controllers: [CompaniesController],
  providers: [
    CompanyService,
    { provide: COMPANY_REPOSITORY, useClass: CompanyRepository },
  ],
  exports: [CompanyService],
})
export class CompaniesModule {}
