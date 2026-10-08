import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiException } from '../common/http';
import { PrismaService } from '../prisma/prisma.module';
import { AuthContext } from './auth.context';

interface AccessPayload {
  sub: string;
  sid: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = String(request.headers.authorization ?? '');
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) {
      throw new ApiException(401, 'UNAUTHORIZED', 'Missing token');
    }
    let payload: AccessPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessPayload>(token);
    } catch {
      throw new ApiException(401, 'UNAUTHORIZED', 'Invalid token');
    }
    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
      include: { user: true },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt < new Date() ||
      session.userId !== payload.sub ||
      session.user.deletedAt
    ) {
      throw new ApiException(401, 'UNAUTHORIZED', 'Invalid token');
    }
    const auth: AuthContext = {
      userId: session.user.id,
      sessionId: session.id,
      destination: session.user.destination,
      displayName: session.user.displayName,
    };
    request.auth = auth;
    return true;
  }
}
