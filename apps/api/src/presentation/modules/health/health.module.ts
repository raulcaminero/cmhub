import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaModule } from '@infrastructure/persistence/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
})
export class HealthModule {}
