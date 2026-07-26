import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/persistence/prisma/prisma.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new ForbiddenException('Usuario no autenticado.');
    }

    const companyId = request.params.companyId;

    let userRole = null;
    if (companyId) {
      userRole = await this.prisma.userCompanyRole.findUnique({
        where: {
          userId_companyId: {
            userId: user.userId,
            companyId,
          },
        },
      });
    } else {
      userRole = await this.prisma.userCompanyRole.findFirst({
        where: {
          userId: user.userId,
          role: 'ADMIN',
        },
      });
    }

    if (!userRole || userRole.role !== 'ADMIN') {
      throw new ForbiddenException('Acceso denegado. Se requieren permisos de Administrador.');
    }

    return true;
  }
}
