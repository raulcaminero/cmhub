import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OcrQueueProcessor } from '../../../application/services/ocr/ocr-queue.processor';
import { OcrService } from '../../../application/services/ocr/ocr.service';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT || 6379),
      },
    }),
    BullModule.registerQueue({
      name: 'ocr-queue',
    }),
  ],
  providers: [OcrQueueProcessor, OcrService],
  exports: [BullModule],
})
export class OcrQueueModule {}
