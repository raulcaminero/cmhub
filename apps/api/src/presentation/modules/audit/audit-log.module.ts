import { Module, Global } from '@nestjs/common';
import { AuditLogService } from '../../../application/services/audit/audit-log.service';
import { AuditLogController } from './audit-log.controller';

@Global()
@Module({
  controllers: [AuditLogController],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
