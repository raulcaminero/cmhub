import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportService } from '@application/services/report/report.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('companies/:companyId/accounting/reports')
export class ReportsController {
  constructor(private readonly reportService: ReportService) {}

  @Get('606')
  @ApiOperation({ summary: 'Export 606 report for DGII' })
  async export606(
    @Param('companyId') companyId: string,
    @Query('period') period: string,
    @Res() res: Response,
  ) {
    const text = await this.reportService.generate606Text(companyId, period);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=DGII_606_${period}.txt`);
    return res.send(text);
  }

  @Get('607')
  @ApiOperation({ summary: 'Export 607 report for DGII' })
  async export607(
    @Param('companyId') companyId: string,
    @Query('period') period: string,
    @Res() res: Response,
  ) {
    const text = await this.reportService.generate607Text(companyId, period);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=DGII_607_${period}.txt`);
    return res.send(text);
  }

  @Get('it1')
  @ApiOperation({ summary: 'Get IT-1 declaration figures summary' })
  getIt1Summary(@Param('companyId') companyId: string, @Query('period') period: string) {
    return this.reportService.getIt1Summary(companyId, period);
  }

  @Get('financials')
  @ApiOperation({ summary: 'Get Balance Sheet and Income Statement' })
  getFinancials(@Param('companyId') companyId: string) {
    return this.reportService.getFinancials(companyId);
  }

  @Get('608')
  @ApiOperation({ summary: 'Export 608 report (voided NCFs) for DGII' })
  async export608(
    @Param('companyId') companyId: string,
    @Query('period') period: string,
    @Res() res: Response,
  ) {
    const text = await this.reportService.generate608Text(companyId, period);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=DGII_608_${period}.txt`);
    return res.send(text);
  }

  @Get('609')
  @ApiOperation({ summary: 'Export 609 report (payments to foreign entities) for DGII' })
  async export609(
    @Param('companyId') companyId: string,
    @Query('period') period: string,
    @Res() res: Response,
  ) {
    const text = await this.reportService.generate609Text(companyId, period);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=DGII_609_${period}.txt`);
    return res.send(text);
  }
}
