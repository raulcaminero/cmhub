import { Injectable, Logger, BadRequestException } from '@nestjs/common';

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

  // Safeguards to prevent accidental billing
  private static dailyRequestCount = 0;
  private static lastResetDate = new Date().toDateString();
  private static readonly DAILY_LIMIT = 500; // Safeguard limit: Max 500 scans per day

  private checkSafeguards(): boolean {
    const currentDateStr = new Date().toDateString();
    if (OcrService.lastResetDate !== currentDateStr) {
      OcrService.dailyRequestCount = 0;
      OcrService.lastResetDate = currentDateStr;
    }

    if (OcrService.dailyRequestCount >= OcrService.DAILY_LIMIT) {
      this.logger.warn(`Safeguard triggered: Daily OCR limit of ${OcrService.DAILY_LIMIT} reached.`);
      return false;
    }

    return true;
  }

  async scanReceipt(imageBuffer: Buffer, mimeType: string): Promise<OcrResult> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      throw new BadRequestException('La clave de API de Inteligencia Artificial (GEMINI_API_KEY) no está configurada.');
    }

    if (!this.checkSafeguards()) {
      throw new BadRequestException('Se ha alcanzado el límite diario de análisis con IA. Por favor intenta más tarde.');
    }

    try {
      this.logger.log(`Invoking Gemini 3.5 Flash for Receipt OCR. Current daily count: ${OcrService.dailyRequestCount}`);
      const base64Data = imageBuffer.toString('base64');

      const prompt = `Analiza la imagen de la factura dominicana y extrae los campos clave.
Responde strictly en formato JSON utilizando el siguiente esquema:
{
  "isInvoice": true si el documento es una factura o comprobante fiscal de gasto/compra (si es un extracto/estado de cuenta bancario pon false),
  "providerRnc": "RNC del proveedor (sólo dígitos, sin guiones)",
  "providerName": "Nombre comercial del proveedor en mayúsculas",
  "ncf": "NCF (Número de Comprobante Fiscal) de 11 o 13 caracteres (ej: B0100000001, E3100000001)",
  "date": "Fecha de la factura en formato ISO YYYY-MM-DD",
  "amount": número con el importe total facturado (incluyendo impuestos),
  "itbis": número con el monto total del ITBIS cobrado (si no tiene ITBIS pon 0),
  "expenseType": "tipo de gasto dominicano de 2 dígitos (ej: '01' para Gastos de Personal, '02' para Suministros y Servicios, '05' para Arrendamientos, '09' para Compras de Inventario)"
}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: mimeType.includes('pdf') ? 'application/pdf' : mimeType,
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  isInvoice: { type: 'BOOLEAN' },
                  providerRnc: { type: 'STRING' },
                  providerName: { type: 'STRING' },
                  ncf: { type: 'STRING' },
                  date: { type: 'STRING' },
                  amount: { type: 'NUMBER' },
                  itbis: { type: 'NUMBER' },
                  expenseType: { type: 'STRING' },
                },
                required: ['isInvoice', 'providerRnc', 'providerName', 'ncf', 'date', 'amount', 'itbis', 'expenseType'],
              },
            },
          }),
        }
      );

      if (!res.ok) {
        throw new BadRequestException(`El servicio de IA devolvió código de respuesta ${res.status}`);
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new BadRequestException('No se pudo leer el contenido del documento.');
      }

      const parsed = JSON.parse(text);

      if (parsed.isInvoice === false) {
        throw new BadRequestException('El documento subido parece ser un Estado de Cuenta Bancario en lugar de una factura de gasto.');
      }

      OcrService.dailyRequestCount++;

      return {
        providerRnc: parsed.providerRnc || '',
        providerName: parsed.providerName || 'PROVEEDOR DESCONOCIDO',
        ncf: parsed.ncf || '',
        date: parsed.date ? new Date(parsed.date) : new Date(),
        amount: Number(parsed.amount) || 0,
        itbis: Number(parsed.itbis) || 0,
        expenseType: parsed.expenseType || '02',
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`Failed to run OCR through Gemini: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || 'Error al procesar la factura con Inteligencia Artificial.');
    }
  }

  async scanBankStatement(
    imageBuffer: Buffer,
    mimeType: string
  ): Promise<Array<{ date: Date; description: string; amount: number }>> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      throw new BadRequestException('La clave de API de Inteligencia Artificial (GEMINI_API_KEY) no está configurada.');
    }

    if (!this.checkSafeguards()) {
      throw new BadRequestException('Se ha alcanzado el límite diario de análisis con IA. Por favor intenta más tarde.');
    }

    try {
      this.logger.log(`Invoking Gemini 3.5 Flash for Statement OCR. Current daily count: ${OcrService.dailyRequestCount}`);
      const base64Data = imageBuffer.toString('base64');

      const prompt = `Analiza la imagen o PDF del estado de cuenta/extracto bancario y extrae la lista de transacciones/movimientos en una tabla.
Responde estrictamente en formato JSON utilizando el siguiente esquema:
{
  "isBankStatement": true si el documento es un estado de cuenta o extracto bancario (si es una factura individual o recibo de compra pon false),
  "transactions": [
    {
      "date": "Fecha del movimiento en formato ISO YYYY-MM-DD",
      "description": "Descripción o concepto del movimiento en mayúsculas",
      "amount": número con el monto del movimiento (si es un retiro/cargo/pago/comisión ponlo como número negativo, si es un depósito/abono/ingreso ponlo positivo)"
    }
  ]
}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: mimeType.includes('pdf') ? 'application/pdf' : mimeType,
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  isBankStatement: { type: 'BOOLEAN' },
                  transactions: {
                    type: 'ARRAY',
                    items: {
                      type: 'OBJECT',
                      properties: {
                        date: { type: 'STRING' },
                        description: { type: 'STRING' },
                        amount: { type: 'NUMBER' },
                      },
                      required: ['date', 'description', 'amount'],
                    },
                  },
                },
                required: ['isBankStatement', 'transactions'],
              },
            },
          }),
        }
      );

      if (!res.ok) {
        throw new BadRequestException(`El servicio de IA devolvió código de respuesta ${res.status}`);
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new BadRequestException('No se pudo leer el contenido del extracto bancario.');
      }

      const parsed = JSON.parse(text);

      if (parsed.isBankStatement === false) {
        throw new BadRequestException('El documento subido no parece ser un Estado de Cuenta Bancario (parece una factura de compra individual). Por favor sube un extracto bancario.');
      }

      OcrService.dailyRequestCount++;

      return (parsed.transactions || []).map((t: any) => ({
        date: t.date ? new Date(t.date) : new Date(),
        description: t.description || 'SIN CONCEPTO',
        amount: Number(t.amount) || 0,
      }));
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`Failed to run bank statement OCR: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || 'Error al procesar el extracto bancario con Inteligencia Artificial.');
    }
  }
}
