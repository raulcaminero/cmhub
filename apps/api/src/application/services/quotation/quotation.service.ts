import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { QuotationStatus } from '@prisma/client';

export interface CreateQuotationLineDto {
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
}

export interface CreateQuotationDto {
  clientRnc?: string;
  clientName: string;
  clientEmail?: string;
  validUntil?: string | Date;
  notes?: string;
  lines: CreateQuotationLineDto[];
}

@Injectable()
export class QuotationService {
  private readonly logger = new Logger(QuotationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createQuotation(companyId: string, dto: CreateQuotationDto) {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('La cotización debe contener al menos una línea de detalle.');
    }

    const year = new Date().getFullYear();
    const count = await this.prisma.quotation.count({
      where: { companyId },
    });
    const number = `COT-${year}-${String(count + 1).padStart(3, '0')}`;

    let overallSubtotal = 0;
    let overallItbis = 0;
    let overallTotal = 0;

    const formattedLines = dto.lines.map((line) => {
      const qty = Number(line.quantity) || 1;
      const price = Number(line.unitPrice) || 0;
      const disc = Number(line.discount) || 0;
      const tax = line.taxRate !== undefined ? Number(line.taxRate) : 18;

      const subtotal = qty * price * (1 - disc / 100);
      const itbis = subtotal * (tax / 100);
      const total = subtotal + itbis;

      overallSubtotal += subtotal;
      overallItbis += itbis;
      overallTotal += total;

      return {
        productId: line.productId || null,
        description: line.description,
        quantity: qty,
        unitPrice: price,
        discount: disc,
        taxRate: tax,
        subtotal: Number(subtotal.toFixed(2)),
        itbis: Number(itbis.toFixed(2)),
        total: Number(total.toFixed(2)),
      };
    });

    return this.prisma.quotation.create({
      data: {
        companyId,
        number,
        clientRnc: dto.clientRnc || null,
        clientName: dto.clientName,
        clientEmail: dto.clientEmail || null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        notes: dto.notes || null,
        status: 'DRAFT',
        subtotal: Number(overallSubtotal.toFixed(2)),
        itbis: Number(overallItbis.toFixed(2)),
        total: Number(overallTotal.toFixed(2)),
        lines: {
          create: formattedLines,
        },
      },
      include: {
        lines: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findByCompany(companyId: string) {
    return this.prisma.quotation.findMany({
      where: { companyId },
      include: {
        lines: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, companyId: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, companyId },
      include: {
        lines: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!quotation) {
      throw new NotFoundException('Cotización no encontrada.');
    }

    return quotation;
  }

  async updateStatus(id: string, companyId: string, status: QuotationStatus) {
    const quotation = await this.findById(id, companyId);
    return this.prisma.quotation.update({
      where: { id: quotation.id },
      data: { status },
    });
  }
}
