import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_SECRET');
    const isProduction = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'prod';
    const finalSecret = secret ?? (isProduction ? undefined : 'dev-jwt-secret');

    if (!finalSecret) {
      throw new Error('JWT_SECRET must be configured in production');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: finalSecret,
    });
  }

  validate(payload: JwtPayload) {
    if (!payload.sub) throw new UnauthorizedException();
    return { userId: payload.sub, email: payload.email };
  }
}
