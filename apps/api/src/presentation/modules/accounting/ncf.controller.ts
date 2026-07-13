import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { NcfSequenceService } from '@application/services/ncf/ncf-sequence.service';
import { CreateNcfSequenceDto } from '@application/dtos/ncf/create-ncf-sequence.dto';
import { NcfType } from '@domain/enums';

@ApiTags('ncf')
@ApiBearerAuth()
@Controller('companies/:companyId/accounting/ncf')
export class NcfController {
  constructor(private readonly ncfSequenceService: NcfSequenceService) {}

  @Get('sequences')
  @ApiOperation({ summary: 'List all NCF sequences' })
  getSequences(@Param('companyId') companyId: string) {
    return this.ncfSequenceService.getSequences(companyId);
  }

  @Post('sequences')
  @ApiOperation({ summary: 'Register a new NCF sequence' })
  createSequence(@Param('companyId') companyId: string, @Body() dto: CreateNcfSequenceDto) {
    return this.ncfSequenceService.createSequence(companyId, dto);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate next NCF in sequence' })
  generateNcf(@Param('companyId') companyId: string, @Body('type') type: NcfType) {
    return this.ncfSequenceService.generateNextNcf(companyId, type);
  }
}
