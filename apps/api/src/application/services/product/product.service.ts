import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { ProductType } from '@prisma/client';

export interface CreateProductDto {
  code?: string;
  sku?: string;
  name: string;
  description?: string;
  type?: ProductType;
  price: number;
  cost?: number;
  taxRate?: number;
  unit?: string;
  revenueAccountId?: string;
}

export interface UpdateProductDto {
  code?: string;
  sku?: string;
  name?: string;
  description?: string;
  type?: ProductType;
  price?: number;
  cost?: number;
  taxRate?: number;
  unit?: string;
  revenueAccountId?: string;
  isActive?: boolean;
}

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createProduct(companyId: string, dto: CreateProductDto) {
    let code = dto.code?.trim();
    
    if (!code) {
      const prefix = dto.type === 'PRODUCT' ? 'PRD' : 'SRV';
      const count = await this.prisma.product.count({
        where: { companyId, type: dto.type || 'SERVICE' },
      });
      code = `${prefix}-${String(count + 1).padStart(3, '0')}`;
    }

    const existing = await this.prisma.product.findUnique({
      where: {
        companyId_code: {
          companyId,
          code,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Ya existe un ítem en el catálogo con el código "${code}".`);
    }

    return this.prisma.product.create({
      data: {
        companyId,
        code,
        sku: dto.sku || null,
        name: dto.name,
        description: dto.description || null,
        type: dto.type || 'SERVICE',
        price: dto.price,
        cost: dto.cost ?? null,
        taxRate: dto.taxRate ?? 18,
        unit: dto.unit || 'unidad',
        revenueAccountId: dto.revenueAccountId || null,
      },
    });
  }

  async findByCompany(companyId: string, includeInactive = false) {
    return this.prisma.product.findMany({
      where: {
        companyId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateProduct(id: string, companyId: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findFirst({
      where: { id, companyId },
    });

    if (!product) {
      throw new NotFoundException('Ítem del catálogo no encontrado.');
    }

    if (dto.code && dto.code !== product.code) {
      const existing = await this.prisma.product.findUnique({
        where: {
          companyId_code: {
            companyId,
            code: dto.code,
          },
        },
      });
      if (existing) {
        throw new ConflictException(`El código "${dto.code}" ya está en uso.`);
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.sku !== undefined && { sku: dto.sku }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.cost !== undefined && { cost: dto.cost }),
        ...(dto.taxRate !== undefined && { taxRate: dto.taxRate }),
        ...(dto.unit !== undefined && { unit: dto.unit }),
        ...(dto.revenueAccountId !== undefined && { revenueAccountId: dto.revenueAccountId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async toggleProductActive(id: string, companyId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, companyId },
    });

    if (!product) {
      throw new NotFoundException('Ítem del catálogo no encontrado.');
    }

    return this.prisma.product.update({
      where: { id },
      data: { isActive: !product.isActive },
    });
  }
}
