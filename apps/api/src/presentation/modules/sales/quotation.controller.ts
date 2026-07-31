import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QuotationService, CreateQuotationDto } from '../../../application/services/quotation/quotation.service';
import { QuotationStatus } from '@prisma/client';

@ApiTags('Sales - Quotations')
@ApiBearerAuth()
@Controller('companies/:companyId/sales/quotations')
export class QuotationController {
  constructor(private readonly quotationService: QuotationService) {}

  @Get()
  @ApiOperation({ summary: 'List company quotations' })
  async getQuotations(@Param('companyId') companyId: string) {
    return this.quotationService.findByCompany(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get quotation details' })
  async getQuotation(
    @Param('companyId') companyId: string,
    @Param('id') id: string
  ) {
    return this.quotationService.findById(id, companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new quotation' })
  async createQuotation(
    @Param('companyId') companyId: string,
    @Body() dto: CreateQuotationDto
  ) {
    return this.quotationService.createQuotation(companyId, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update quotation status' })
  async updateStatus(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body: { status: QuotationStatus }
  ) {
    return this.quotationService.updateStatus(id, companyId, body.status);
  }
}
