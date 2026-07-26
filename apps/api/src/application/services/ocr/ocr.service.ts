import { Injectable, Logger } from '@nestjs/common';

export interface OcrResult {
  providerRnc: string;
  providerName: string;
  ncf: string;
  date: Date;
  amount: number;
  itbis: number;
  expenseType: string;
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  async scanReceipt(imageBuffer: Buffer, mimeType: string): Promise<OcrResult> {
    // If Google Cloud credentials are not configured, simulate OCR reading for testing
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_CLOUD_PROJECT) {
      this.logger.log('GOOGLE_APPLICATION_CREDENTIALS not configured. Simulating OCR parsing.');
      return this.simulateOcrResult();
    }

    try {
      // Blueprint for real Google Cloud Document AI / Vision API call
      // In a real environment, you would call:
      // const client = new DocumentProcessorServiceClient();
      // const [result] = await client.processDocument({ name: processorName, rawDocument: { content: imageBuffer, mimeType } });
      
      // For development, we return the simulation unless fully configured
      return this.simulateOcrResult();
    } catch (error) {
      this.logger.error('Failed to run OCR through Google Cloud. Falling back to simulation.', error);
      return this.simulateOcrResult();
    }
  }

  private simulateOcrResult(): OcrResult {
    // Simulated Dominican Republic purchase receipt data
    const rncs = ['131792751', '101010632', '130862035'];
    const providers = ['CLARO DOMINICANA', 'SUPERMERCADOS NACIONAL', 'ALTICE DOMINICANA'];
    const expenseTypes = ['02', '05', '02']; // 02: Suministros/Servicios, 05: Arrendamientos/etc
    
    const index = Math.floor(Math.random() * rncs.length);
    const amount = Number((1500 + Math.random() * 3000).toFixed(2));
    const itbis = Number((amount * 0.18).toFixed(2)); // 18% ITBIS

    // Generate a random NCF B01 sequence number
    const randomSeq = Math.floor(100 + Math.random() * 900);
    const ncf = `B0100000${randomSeq}`;

    return {
      providerRnc: rncs[index],
      providerName: providers[index],
      ncf,
      date: new Date(),
      amount,
      itbis,
      expenseType: expenseTypes[index],
    };
  }

  async scanBankStatement(imageBuffer: Buffer, mimeType: string): Promise<Array<{ date: Date; description: string; amount: number }>> {
    this.logger.log('Simulating bank statement OCR table parsing.');
    return this.simulateBankStatementResult();
  }

  private simulateBankStatementResult(): Array<{ date: Date; description: string; amount: number }> {
    const today = new Date();
    return [
      {
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10),
        description: 'DEPOSIT / TRANSFERENCIA RECIBIDA CLIENTE',
        amount: 25000.00,
      },
      {
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 8),
        description: 'RET / COMISION BANCARIA RETENCION 0.15%',
        amount: -37.50,
      },
      {
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5),
        description: 'PAYMENT / CLARO DOMINICANA COMPRAS',
        amount: -2360.00,
      },
      {
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2),
        description: 'DEPOSIT / ABONO FACTURA CLIENTE MULTIPLES NCF',
        amount: 15400.00,
      },
    ];
  }
}
