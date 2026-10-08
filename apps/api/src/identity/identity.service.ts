import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { newSecret, otpCode, sha256 } from '../common/crypto';
import { ApiException } from '../common/http';
import { PrismaService } from '../prisma/prisma.module';
import { RedisService } from '../redis/redis.module';
import { defaultDisplayName, normalizeDestination } from './destination';

const REFRESH_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async requestOtp(destinationRaw: string) {
    const destination = normalizeDestination(destinationRaw);
    const rateKey = `otp:rate:${destination}`;
    const attempts = await this.redis.client.incr(rateKey);
    if (attempts === 1) await this.redis.client.expire(rateKey, 600);
    if (attempts > 5) {
      throw new ApiException(429, 'OTP_RATE_LIMITED', 'Too many codes requested');
    }
    const code = otpCode();
    await this.redis.client.set(`otp:${destination}`, code, 'EX', 300);
    if (this.config.get<string>('OTP_LOG_CODE') === 'true') {
      this.logger.log(`OTP for ${destination}: ${code}`);
    }
    return { ok: true };
  }

  async createSession(input: {
    destination: string;
    code: string;
    device: { platform: string; pushToken?: string };
  }) {
    const destination = normalizeDestination(input.destination);
    const stored = await this.redis.client.get(`otp:${destination}`);
    if (!stored || stored !== input.code) {
      throw new ApiException(401, 'INVALID_OTP', 'The code is wrong or expired');
    }
    await this.redis.client.del(`otp:${destination}`);

    const existing = await this.prisma.user.findUnique({ where: { destination } });
    if (existing?.deletedAt) {
      throw new ApiException(401, 'ACCOUNT_DELETED', 'This account has been deleted');
    }
    const user = existing
      ? existing
      : await this.prisma.user.create({
          data: { destination, displayName: defaultDisplayName(destination) },
        });

    const refreshToken = newSecret();
    const session = await this.prisma.$transaction(async (tx) => {
      const device = await tx.device.create({
        data: {
          userId: user.id,
          platform: input.device.platform,
          pushToken: input.device.pushToken,
        },
      });
      return tx.session.create({
        data: {
          userId: user.id,
          deviceId: device.id,
          refreshHash: sha256(refreshToken),
          expiresAt: new Date(Date.now() + REFRESH_MS),
        },
      });
    });

    return {
      ...(await this.tokensFor(user.id, session.id, refreshToken)),
      user: this.userView(user),
    };
  }

  async refresh(refreshToken: string) {
    const session = await this.prisma.session.findUnique({
      where: { refreshHash: sha256(refreshToken) },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date() || session.user.deletedAt) {
      throw new ApiException(401, 'UNAUTHORIZED', 'Invalid refresh token');
    }
    const next = newSecret();
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshHash: sha256(next),
        expiresAt: new Date(Date.now() + REFRESH_MS),
      },
    });
    return {
      ...(await this.tokensFor(session.userId, session.id, next)),
      user: this.userView(session.user),
    };
  }

  async logout(sessionId: string) {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  private async tokensFor(userId: string, sessionId: string, refreshToken: string) {
    const accessToken = await this.jwt.signAsync({ sub: userId, sid: sessionId });
    return { accessToken, refreshToken };
  }

  private userView(user: { id: string; destination: string; displayName: string }) {
    return {
      id: user.id,
      destination: user.destination,
      displayName: user.displayName,
    };
  }
}

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
