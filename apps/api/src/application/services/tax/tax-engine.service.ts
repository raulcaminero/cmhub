import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma/prisma.service';

@Injectable()
export class TaxEngineService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get default VAT / Sales tax rate for a company (returns percentage e.g. 18 for 18%)
   */
  async getDefaultVatRate(companyId: string): Promise<number> {
    const rate = await this.prisma.taxRate.findFirst({
      where: { companyId, isDefault: true, isActive: true },
    });
    if (rate) {
      return Number(rate.rate) * 100;
    }
    // Fallback if no rate seeded yet
    return 18;
  }

  /**
   * Get all active tax rates for a company
   */
  async getCompanyTaxRates(companyId: string) {
    return this.prisma.taxRate.findMany({
      where: { companyId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Calculate tax amount for a subtotal
   */
  async calculateTax(companyId: string, subtotal: number, taxCode?: string): Promise<{ rate: number; amount: number }> {
    let taxRateRecord = null;

    if (taxCode) {
      taxRateRecord = await this.prisma.taxRate.findFirst({
        where: { companyId, code: taxCode, isActive: true },
      });
    }

    if (!taxRateRecord) {
      taxRateRecord = await this.prisma.taxRate.findFirst({
        where: { companyId, isDefault: true, isActive: true },
      });
    }

    if (!taxRateRecord) {
      return { rate: 18, amount: Number((subtotal * 0.18).toFixed(2)) };
    }

    const rateNum = Number(taxRateRecord.rate);
    return {
      rate: rateNum * 100,
      amount: Number((subtotal * rateNum).toFixed(2)),
    };
  }
}
