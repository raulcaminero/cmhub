import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { InvoiceService } from '@application/services/invoice/invoice.service';
import { CreateInvoiceDto } from '@application/dtos/invoice/create-invoice.dto';
import { CollectInvoiceDto } from '@application/dtos/invoice/collect-invoice.dto';

@ApiTags('invoices')
@ApiBearerAuth()
@Controller('companies/:companyId/accounting/invoices')
export class InvoicesController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  @ApiOperation({ summary: 'List all company invoices (paginated and filtered by date)' })
  getInvoices(
    @Param('companyId') companyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.invoiceService.getInvoices(companyId, { page, limit, startDate, endDate });
  }

  @Post()
  @ApiOperation({ summary: 'Create a new invoice and auto-consume NCF sequence' })
  createInvoice(@Param('companyId') companyId: string, @Body() dto: CreateInvoiceDto) {
    return this.invoiceService.createInvoice(companyId, dto);
  }

  @Post(':id/collect')
  @ApiOperation({ summary: 'Record collection of a credit invoice' })
  collectInvoice(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: CollectInvoiceDto,
  ) {
    return this.invoiceService.collectInvoice(companyId, id, dto);
  }

  @Post(':id/void')
  @ApiOperation({ summary: 'Void an invoice and reverse its accounting ledger entry' })
  voidInvoice(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.invoiceService.voidInvoice(companyId, id);
  }
}
