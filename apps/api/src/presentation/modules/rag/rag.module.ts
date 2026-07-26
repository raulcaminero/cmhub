import { Module } from '@nestjs/common';
import { TaxCopilotController } from './tax-copilot.controller';
import { TaxCopilotService } from '../../../application/services/rag/tax-copilot.service';
import { RagService } from '../../../application/services/rag/rag.service';

@Module({
  controllers: [TaxCopilotController],
  providers: [TaxCopilotService, RagService],
  exports: [TaxCopilotService, RagService],
})
export class RagModule {}
