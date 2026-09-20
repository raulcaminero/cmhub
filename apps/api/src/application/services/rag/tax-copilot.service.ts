import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { RagService } from './rag.service';

@Injectable()
export class TaxCopilotService {
  private readonly logger = new Logger(TaxCopilotService.name);

  // In-memory safeguards to cap daily chat queries per user to prevent massive billing API loops
  private static userDailyCounts: Record<string, { count: number; date: string }> = {};
  private static readonly USER_DAILY_LIMIT = 50;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ragService: RagService
  ) {}

  private checkSafeguards(userId: string): boolean {
    const today = new Date().toDateString();
    const userLog = TaxCopilotService.userDailyCounts[userId];

    if (!userLog || userLog.date !== today) {
      TaxCopilotService.userDailyCounts[userId] = { count: 1, date: today };
      return true;
    }

    if (userLog.count >= TaxCopilotService.USER_DAILY_LIMIT) {
      return false;
    }

    userLog.count++;
    return true;
  }

  async askCopilot(companyId: string, question: string, userId: string): Promise<string> {
    if (!this.checkSafeguards(userId)) {
      return '⚠️ Has alcanzado el límite de 50 consultas diarias con tu Asistente Financiero para esta cuenta de prueba. El límite se restablecerá mañana.';
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return '⚠️ El Asistente Fiscal no está activo. Configure la variable `GEMINI_API_KEY` para iniciar el chat con inteligencia artificial.';
    }

    try {
      // 1. Check if the question is related to Dominican tax laws (triggering RAG)
      const lowercaseQuestion = question.toLowerCase();
      let contextString = '';

      const isTaxRelated = 
        lowercaseQuestion.includes('itbis') ||
        lowercaseQuestion.includes('isr') ||
        lowercaseQuestion.includes('ncf') ||
        lowercaseQuestion.includes('dgii') ||
        lowercaseQuestion.includes('retencion') ||
        lowercaseQuestion.includes('606') ||
        lowercaseQuestion.includes('607') ||
        lowercaseQuestion.includes('impuesto') ||
        lowercaseQuestion.includes('factura');

      if (isTaxRelated) {
        this.logger.log('Query matches tax topics. Retrieving DGII RAG context...');
        const chunks = await this.ragService.retrieveContext(question, 3);
        if (chunks.length > 0) {
          contextString = `\n[Leyes y Normativas DGII de Referencia]:\n${chunks.map((c, idx) => `[Fragmento ${idx + 1}]: ${c}`).join('\n')}\n`;
        }
      }

      // Fetch company profile for context
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true, rnc: true },
      });

      const companyContext = company
        ? `Empresa activa: ${company.name} (RNC: ${company.rnc}). `
        : '';

      const systemPrompt = `Eres el Asistente Fiscal y Financiero experto para la República Dominicana integrado en el software ERP CMHub.
Tu rol es identificarte siempre como "Asistente Fiscal y Financiero de CMHub" y responder preguntas de contabilidad, impuestos y finanzas de forma profesional, clara y amigable en español.
${companyContext}
Cuando te pregunten sobre las finanzas (ingresos, gastos o bancos), debes utilizar obligatoriamente las herramientas (functions) provistas. No intentes adivinar o inventar cifras.
Si usas leyes provistas en el contexto, cítalas indicando el fragmento o artículo específico.
${contextString}`;

      // 2. Define Gemini Tool Declarations for Function Calling
      const tools = [
        {
          functionDeclarations: [
            {
              name: 'getRevenueSummary',
              description: 'Obtiene la suma total de ingresos facturados de la empresa para un año y mes específico.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  year: { type: 'INTEGER', description: 'El año en formato YYYY (ej: 2026)' },
                  month: { type: 'INTEGER', description: 'El mes del 1 al 12 (ej: 7 para julio)' },
                },
                required: ['year', 'month'],
              },
            },
            {
              name: 'getExpenseSummary',
              description: 'Obtiene los gastos de la empresa del mes agrupados por su tipo de gasto dominicano de la DGII.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  year: { type: 'INTEGER', description: 'El año en formato YYYY (ej: 2026)' },
                  month: { type: 'INTEGER', description: 'El mes del 1 al 12 (ej: 7)' },
                },
                required: ['year', 'month'],
              },
            },
            {
              name: 'getBankBalances',
              description: 'Obtiene los balances de saldo en libros actuales de todas las cuentas bancarias de la empresa.',
              parameters: {
                type: 'OBJECT',
                properties: {},
              },
            },
          ],
        },
      ];

      // 3. First invocation to Gemini (passing the prompt and user request)
      const contents = [
        {
          role: 'user',
          parts: [
            { text: systemPrompt },
            { text: `Pregunta del usuario: "${question}"` },
          ],
        },
      ];

      let response = await this.callGemini(apiKey, contents, tools);

      // 4. Process Function Call Loop (Gemini requesting DB data)
      let candidateParts = response.candidates?.[0]?.content?.parts || [];
      let functionCalls = candidateParts.filter((p: any) => p.functionCall);
      let loopCount = 0;
      const MAX_LOOPS = 5;

      while (functionCalls.length > 0 && loopCount < MAX_LOOPS) {
        loopCount++;
        // Add the function calls to context history
        contents.push(response.candidates[0].content);

        const responseParts: any[] = [];
        const now = new Date();

        for (const callPart of functionCalls) {
          const { name, args, id } = callPart.functionCall;
          this.logger.log(`Gemini requested function execution: "${name}" with args: ${JSON.stringify(args)}`);

          const year = Number(args?.year) || now.getFullYear();
          const month = Number(args?.month) || (now.getMonth() + 1);

          let toolResult: any = {};
          if (name === 'getRevenueSummary') {
            toolResult = await this.getRevenueSummary(companyId, year, month);
          } else if (name === 'getExpenseSummary') {
            toolResult = await this.getExpenseSummary(companyId, year, month);
          } else if (name === 'getBankBalances') {
            toolResult = await this.getBankBalances(companyId);
          }

          responseParts.push({
            functionResponse: {
              name,
              id, // Critical for Gemini 2.0+ and 3.5+
              response: toolResult,
            },
          });
        }

        // Add the responses of the function executions to context history
        contents.push({
          role: 'user',
          parts: responseParts,
        });

        // Recall Gemini with context and results to let it synthesize the final answer
        response = await this.callGemini(apiKey, contents, tools);
        candidateParts = response.candidates?.[0]?.content?.parts || [];
        functionCalls = candidateParts.filter((p: any) => p.functionCall);
      }

      const finalParts = response.candidates?.[0]?.content?.parts || [];
      const finalReply = finalParts.find((p: any) => p.text)?.text;
      if (!finalReply) {
        this.logger.warn(`Gemini returned empty text. Raw response: ${JSON.stringify(response)}`);
        return `Lo siento, no pude procesar la consulta fiscal en este momento. Raw response: ${JSON.stringify(response)}`;
      }
      return finalReply;
    } catch (err: any) {
      this.logger.error(`Error in Tax Copilot Service: ${err.message}`, err.stack);
      return `⚠️ Error en Tax Copilot: ${err.message}`;
    }
  }

  private async callGemini(apiKey: string, contents: any[], tools: any[]): Promise<any> {
    const endpoints = [
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent',
    ];

    let lastError = '';
    const errors: string[] = [];

    for (const endpoint of endpoints) {
      try {
        const url = `${endpoint}?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            tools,
          }),
        });

        if (res.ok) {
          return await res.json();
        }

        const errText = await res.text();
        const errorMsg = `[${endpoint}] ${res.status}: ${errText}`;
        lastError = errorMsg;
        errors.push(errorMsg);
        this.logger.warn(`Gemini API endpoint failed: ${errorMsg}`);

        // If it's a 400 error (Bad Request), the payload is malformed. 
        // Changing the model won't fix it, so throw immediately.
        if (res.status === 400) {
          throw new Error(`Bad Request (400) from Gemini API: ${errText}`);
        }
      } catch (err: any) {
        if (err.message.includes('Bad Request (400)')) {
          throw err;
        }
        const errorMsg = `[${endpoint}] Fetch error: ${err.message}`;
        lastError = errorMsg;
        errors.push(errorMsg);
      }
    }

    this.logger.error(`All Gemini model endpoints failed:\n${errors.join('\n')}`);
    
    // If we failed, let's try to fetch the available models to help debug
    let availableModels = 'Could not fetch available models.';
    try {
      const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (listRes.ok) {
        const data = await listRes.json();
        if (data.models) {
          const names = data.models
            .filter((m: any) => m.supportedGenerationMethods.includes('generateContent'))
            .map((m: any) => m.name)
            .join(', ');
          availableModels = `Available models for your API key: ${names}`;
        }
      } else {
        availableModels = `ListModels failed with status ${listRes.status}: ${await listRes.text()}`;
      }
    } catch (e: any) {
      availableModels = `ListModels error: ${e.message}`;
    }

    throw new Error(`Google Gemini API failed. Errors:\n${errors.join('\n')}\n\nDEBUG INFO: ${availableModels}`);
  }

  // --- INTERNAL TOOLS FOR DATABASE FINANCIAL QUERIES ---

  private async getRevenueSummary(companyId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        date: { gte: start, lte: end },
        isVoided: false,
      },
      select: { amount: true },
    });

    const total = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
    return {
      year,
      month,
      totalRevenue: total,
      invoiceCount: invoices.length,
    };
  }

  private async getExpenseSummary(companyId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const expenses = await this.prisma.expense.findMany({
      where: {
        companyId,
        date: { gte: start, lte: end },
        isVoided: false,
      },
      select: { amount: true, expenseType: true },
    });

    const categories: Record<string, string> = {
      '01': 'Gastos de Personal (Nómina)',
      '02': 'Suministros y Servicios',
      '03': 'Arrendamientos',
      '04': 'Gastos de Activos Fijos',
      '05': 'Representación y Relaciones Públicas',
      '06': 'Gastos Financieros / Comisiones',
      '07': 'Gastos de Seguros',
      '08': 'Gastos de Viajes',
      '09': 'Compras de Inventario / Costos',
    };

    const summary: Record<string, number> = {};
    expenses.forEach((e) => {
      const label = categories[e.expenseType] || `Otros Gastos (${e.expenseType})`;
      summary[label] = (summary[label] || 0) + Number(e.amount);
    });

    const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      year,
      month,
      expensesByCategory: summary,
      totalExpenses: total,
    };
  }

  private async getBankBalances(companyId: string) {
    // Bank/Cash accounts in dominican accounting typical charts usually start with '1101'
    const accounts = await this.prisma.account.findMany({
      where: {
        companyId,
        code: { startsWith: '1101' },
        isActive: true,
      },
      select: { id: true, name: true, code: true },
    });

    const balances = [];
    for (const acc of accounts) {
      const lines = await this.prisma.journalEntryLine.findMany({
        where: {
          accountId: acc.id,
          journalEntry: {
            companyId,
            status: 'POSTED',
          },
        },
        select: { debit: true, credit: true },
      });

      const balance = lines.reduce((sum, l) => sum + Number(l.debit) - Number(l.credit), 0);
      balances.push({
        accountCode: acc.code,
        accountName: acc.name,
        balance,
      });
    }

    return {
      bankBalances: balances,
    };
  }
}
