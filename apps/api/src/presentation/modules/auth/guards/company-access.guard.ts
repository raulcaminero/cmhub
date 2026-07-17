import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@infrastructure/persistence/prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class CompanyAccessGuard implements CanActivate {
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

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !user.userId) {
      return false;
    }

    let companyId = request.params.companyId;
    if (!companyId && request.params.id && request.route?.path?.startsWith('/companies/:id')) {
      companyId = request.params.id;
    }

    if (!companyId) {
      return true;
    }

    const role = await this.prisma.userCompanyRole.findUnique({
      where: {
        userId_companyId: {
          userId: user.userId,
          companyId,
        },
      },
    });

    if (!role) {
      throw new ForbiddenException('No tienes acceso a esta empresa.');
    }

    return true;
  }
}
