import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { InvoiceService } from '@application/services/invoice/invoice.service';
import { CreateInvoiceDto } from '@application/dtos/invoice/create-invoice.dto';

@ApiTags('invoices')
@ApiBearerAuth()
@Controller('companies/:companyId/accounting/invoices')
export class InvoicesController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  @ApiOperation({ summary: 'List all company invoices' })
  getInvoices(@Param('companyId') companyId: string) {
    return this.invoiceService.getInvoices(companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new invoice and auto-consume NCF sequence' })
  createInvoice(@Param('companyId') companyId: string, @Body() dto: CreateInvoiceDto) {
    return this.invoiceService.createInvoice(companyId, dto);
  }
}
