import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditLogService } from '../../../application/services/audit/audit-log.service';
import { CompanyAccessGuard } from '../auth/guards/company-access.guard';

import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Audit')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.CONTADOR)
@Controller('companies/:companyId/audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'Get company audit log entries' })
  async getAuditLogs(
    @Param('companyId') companyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.auditLogService.getCompanyAuditLogs(companyId, limitNum, pageNum);
  }
}
