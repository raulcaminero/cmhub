import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/persistence/prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

import { extractCompanyId } from './extract-company-id.helper';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !user.userId) {
      throw new ForbiddenException('Usuario no autenticado.');
    }

    const companyId = extractCompanyId(request);

    if (!companyId) {
      // If endpoint doesn't belong to a company scope, check general user roles
      return true;
    }

    const userCompanyRole = await this.prisma.userCompanyRole.findUnique({
      where: {
        userId_companyId: {
          userId: user.userId,
          companyId,
        },
      },
    });

    if (!userCompanyRole) {
      throw new ForbiddenException('No tienes acceso a esta empresa.');
    }

    const hasRole = requiredRoles.includes(userCompanyRole.role);
    if (!hasRole) {
      throw new ForbiddenException('No tienes permisos suficientes para realizar esta acción.');
    }

    return true;
  }
}
