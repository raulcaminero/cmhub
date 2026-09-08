import { Controller, Post, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { DgiiEcfService } from '@application/services/dgii-ecf/dgii-ecf.service';

@ApiTags('dgii-ecf')
@ApiBearerAuth()
@Controller('companies/:companyId/accounting/invoices')
export class DgiiEcfController {
  constructor(private readonly ecfService: DgiiEcfService) {}

  @Post(':id/transmit-ecf')
  @ApiOperation({ summary: 'Transmit signed e-CF (electronic invoice) to DGII' })
  transmitEcf(@Param('id') id: string) {
    return this.ecfService.processEcfForInvoice(id);
  }

  @Get(':id/ecf-status')
  @ApiOperation({ summary: 'Check live processing status of an e-CF at DGII by TrackID' })
  checkStatus(@Param('id') id: string) {
    return this.ecfService.checkEcfStatus(id);
  }
}
