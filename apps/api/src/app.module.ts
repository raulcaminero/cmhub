import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';
import { PrismaModule } from '@infrastructure/persistence/prisma/prisma.module';
import { AuthModule } from '@presentation/modules/auth/auth.module';
import { CompaniesModule } from '@presentation/modules/companies/companies.module';
import { AccountingModule } from '@presentation/modules/accounting/accounting.module';
import { RagModule } from '@presentation/modules/rag/rag.module';
import { SalesModule } from '@presentation/modules/sales/sales.module';
import { MailModule } from './infrastructure/mail/mail.module';
import { AppCacheModule } from './infrastructure/cache/app-cache.module';
import { AuditLogModule } from './presentation/modules/audit/audit-log.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [path.resolve(__dirname, '../.env')],
      expandVariables: true,
    }),
    PrismaModule,
    AppCacheModule,
    MailModule,
    AuditLogModule,
    AuthModule,
    CompaniesModule,
    AccountingModule,
    RagModule,
    SalesModule,
  ],
})
export class AppModule {}
