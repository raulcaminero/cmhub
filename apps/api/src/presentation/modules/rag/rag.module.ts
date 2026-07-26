import { Module } from '@nestjs/common';
import { TaxCopilotController } from './tax-copilot.controller';
import { TaxCopilotService } from '../../../application/services/rag/tax-copilot.service';
import { RagService } from '../../../application/services/rag/rag.service';
import { AdminGuard } from '../auth/guards/admin.guard';

@Module({
  controllers: [TaxCopilotController],
  providers: [TaxCopilotService, RagService, AdminGuard],
  exports: [TaxCopilotService, RagService],
})
export class RagModule {}
