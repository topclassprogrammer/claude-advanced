import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

export interface AuthenticatedUser {
  sub: string;
  email: string;
}

interface JwtPayload extends AuthenticatedUser {
  iat: number;
}

function extractBearerToken(request: Request): string | undefined {
  const [type, token] = request.headers.authorization?.split(' ') ?? [];
  return type === 'Bearer' ? token : undefined;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token, {
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { passwordChangedAt: true },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    if (
      user.passwordChangedAt &&
      payload.iat <= Math.floor(user.passwordChangedAt.getTime() / 1000)
    ) {
      throw new UnauthorizedException(
        'Token was issued before the last password change',
      );
    }

    request.user = { sub: payload.sub, email: payload.email };
    return true;
  }
}
