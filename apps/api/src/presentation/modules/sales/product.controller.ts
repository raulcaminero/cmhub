import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ProductService, CreateProductDto, UpdateProductDto } from '../../../application/services/product/product.service';

@ApiTags('Sales - Catalog')
@ApiBearerAuth()
@Controller('companies/:companyId/sales/products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000) // 5 minutes cache in ms
  @ApiOperation({ summary: 'List company products and services' })
  async getProducts(
    @Param('companyId') companyId: string,
    @Query('includeInactive') includeInactive?: string
  ) {
    return this.productService.findByCompany(companyId, includeInactive === 'true');
  }

  @Post()
  @ApiOperation({ summary: 'Create new product or service in catalog' })
  async createProduct(
    @Param('companyId') companyId: string,
    @Body() dto: CreateProductDto
  ) {
    return this.productService.createProduct(companyId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update catalog item details' })
  async updateProduct(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto
  ) {
    return this.productService.updateProduct(id, companyId, dto);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Toggle product active/inactive state' })
  async toggleActive(
    @Param('companyId') companyId: string,
    @Param('id') id: string
  ) {
    return this.productService.toggleProductActive(id, companyId);
  }
}
