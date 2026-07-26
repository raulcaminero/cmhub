import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { OcrService } from './ocr.service';
import * as fs from 'fs';

@Processor('ocr-queue')
export class OcrQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(OcrQueueProcessor.name);

  constructor(
    private readonly ocrService: OcrService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing OCR job ${job.id} for task: ${job.name}`);
    const { filePath, mimeType } = job.data;

    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Temp file not found: ${filePath}`);
      }

      const fileBuffer = fs.readFileSync(filePath);

      let result: any;
      if (job.name === 'process-receipt') {
        result = await this.ocrService.scanReceipt(fileBuffer, mimeType);
      } else if (job.name === 'process-statement') {
        result = await this.ocrService.scanBankStatement(fileBuffer, mimeType);
      } else {
        throw new Error(`Unknown job name: ${job.name}`);
      }

      // Delete temporary file after successful parsing
      try {
        fs.unlinkSync(filePath);
      } catch (err: any) {
        this.logger.warn(`Failed to delete temp file ${filePath}: ${err.message}`);
      }

      this.logger.log(`Completed OCR job ${job.id} with status: SUCCESS`);
      return result;
    } catch (error: any) {
      this.logger.error(`Error processing job ${job.id}: ${error.message}`, error.stack);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        // Ignore file cleanup errors
      }
      throw error;
    }
  }
}
