import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET', 'dev-secret-change-me'),
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    if (!payload.sub) {
      throw new UnauthorizedException();
    }
    return { sub: payload.sub, email: payload.email, role: payload.role };
  }
}
