import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';

export interface CreateAuditLogParams {
  companyId?: string;
  userId?: string;
  action: string;
  entity: string;
  entityId: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logAction(params: CreateAuditLogParams) {
    try {
      const log = await this.prisma.auditLog.create({
        data: {
          companyId: params.companyId,
          userId: params.userId,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          details: params.details ? JSON.parse(JSON.stringify(params.details)) : undefined,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });
      return log;
    } catch (err: any) {
      this.logger.error(`Error al registrar bitácora de auditoría: ${err.message}`, err.stack);
      return null;
    }
  }

  async getCompanyAuditLogs(companyId: string, limit = 50, page = 1) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where: { companyId } }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
