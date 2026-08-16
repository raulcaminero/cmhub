import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';
import { PrismaModule } from '@infrastructure/persistence/prisma/prisma.module';
import { AuthModule } from '@presentation/modules/auth/auth.module';
import { CompaniesModule } from '@presentation/modules/companies/companies.module';
import { AccountingModule } from '@presentation/modules/accounting/accounting.module';
import { RagModule } from '@presentation/modules/rag/rag.module';
import { SalesModule } from '@presentation/modules/sales/sales.module';
import { HealthModule } from '@presentation/modules/health/health.module';
import { MailModule } from './infrastructure/mail/mail.module';
import { AppCacheModule } from './infrastructure/cache/app-cache.module';
import { AuditLogModule } from './presentation/modules/audit/audit-log.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [path.resolve(__dirname, '../.env')],
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      expandVariables: true,
    }),
    PrismaModule,
    HealthModule,
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
