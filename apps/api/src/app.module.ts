import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';
import { PrismaModule } from '@infrastructure/persistence/prisma/prisma.module';
import { AuthModule } from '@presentation/modules/auth/auth.module';
import { CompaniesModule } from '@presentation/modules/companies/companies.module';
import { AccountingModule } from '@presentation/modules/accounting/accounting.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [path.resolve(__dirname, '../.env')],
      expandVariables: true,
    }),
    PrismaModule,
    AuthModule,
    CompaniesModule,
    AccountingModule,
  ],
})
export class AppModule {}
