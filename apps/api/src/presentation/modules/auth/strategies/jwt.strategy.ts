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
    if (!secret && process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret ?? 'dev-jwt-secret',
    });
  }

  validate(payload: JwtPayload) {
    if (!payload.sub) throw new UnauthorizedException();
    return { userId: payload.sub, email: payload.email };
  }
}
