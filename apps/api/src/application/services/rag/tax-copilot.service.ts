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
      const candidatePart = response.candidates?.[0]?.content?.parts?.[0];
      if (candidatePart?.functionCall) {
        const { name, args } = candidatePart.functionCall;
        this.logger.log(`Gemini requested function execution: "${name}" with args: ${JSON.stringify(args)}`);

        let toolResult: any = {};
        if (name === 'getRevenueSummary') {
          toolResult = await this.getRevenueSummary(companyId, args.year, args.month);
        } else if (name === 'getExpenseSummary') {
          toolResult = await this.getExpenseSummary(companyId, args.year, args.month);
        } else if (name === 'getBankBalances') {
          toolResult = await this.getBankBalances(companyId);
        }

        // Add the function call to context history
        contents.push(response.candidates[0].content);

        // Add the response of the function execution to context history
        contents.push({
          role: 'user', // Gemini REST API structure maps the function response as a return message
          parts: [
            {
              functionResponse: {
                name,
                response: toolResult,
              },
            } as any,
          ],
        });

        // Recall Gemini with context and results to let it synthesize the final answer
        response = await this.callGemini(apiKey, contents, tools);
      }

      const finalReply = response.candidates?.[0]?.content?.parts?.[0]?.text;
      return finalReply || 'Lo siento, no pude procesar la consulta fiscal en este momento.';
    } catch (err: any) {
      this.logger.error(`Error in Tax Copilot Service: ${err.message}`, err.stack);
      return '⚠️ Ocurrió un error al procesar tu consulta con la IA. Por favor verifica los datos o intenta de nuevo.';
    }
  }

  private async callGemini(apiKey: string, contents: any[], tools: any[]): Promise<any> {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          tools,
        }),
      }
    );

    if (!res.ok) {
      throw new Error(`Google API returned code ${res.status}`);
    }

    return res.json();
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
