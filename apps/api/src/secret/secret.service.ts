import { Injectable } from '@nestjs/common';
import { SecretMessage } from '@prisma/client';
import { ApiException } from '../common/http';
import { MembershipService } from '../pair/membership.service';
import { PrismaService } from '../prisma/prisma.module';
import { RedisService } from '../redis/redis.module';

export interface SecretInput {
  kind: 'text' | 'image';
  body?: string;
  imageRef?: string;
}

@Injectable()
export class SecretService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly redis: RedisService,
  ) {}

  async list(userId: string) {
    const member = await this.requirePair(userId);
    const secrets = await this.prisma.secretMessage.findMany({
      where: { partnershipId: member.partnershipId },
      orderBy: { createdAt: 'asc' },
    });
    return secrets.map((secret) => this.view(secret, userId));
  }

  async create(userId: string, input: SecretInput) {
    const member = await this.requirePair(userId);
    if (input.kind === 'text' && !input.body) {
      throw new ApiException(400, 'VALIDATION_ERROR', 'Text secrets need a body');
    }
    if (input.kind === 'image' && !input.imageRef) {
      throw new ApiException(400, 'VALIDATION_ERROR', 'Image secrets need an image');
    }
    const secret = await this.prisma.secretMessage.create({
      data: {
        partnershipId: member.partnershipId,
        senderId: userId,
        kind: input.kind,
        body: input.kind === 'text' ? input.body : null,
        imageRef: input.kind === 'image' ? input.imageRef : null,
      },
    });
    await this.redis.client.publish(
      'chat',
      JSON.stringify({
        partnershipId: member.partnershipId,
        type: 'secret.created',
        data: { id: secret.id, senderId: userId, kind: secret.kind },
      }),
    );
    return this.view(secret, userId);
  }

  async reveal(userId: string, secretId: string) {
    const member = await this.requirePair(userId);
    const secret = await this.prisma.secretMessage.findFirst({
      where: { id: secretId, partnershipId: member.partnershipId },
    });
    if (!secret) throw new ApiException(404, 'SECRET_NOT_FOUND', 'Secret message not found');
    if (secret.senderId === userId) {
      throw new ApiException(400, 'SECRET_SENDER', 'The sender already knows this message');
    }
    const revealed = secret.revealedAt
      ? secret
      : await this.prisma.secretMessage.update({
          where: { id: secret.id },
          data: { revealedAt: new Date() },
        });
    await this.redis.client.publish(
      'chat',
      JSON.stringify({
        partnershipId: member.partnershipId,
        type: 'secret.revealed',
        data: { id: revealed.id, revealedAt: revealed.revealedAt?.toISOString() },
      }),
    );
    return this.view(revealed, userId);
  }

  private async requirePair(userId: string) {
    const member = await this.membership.findActive(userId);
    if (!member) throw new ApiException(404, 'PARTNERSHIP_NOT_FOUND', 'You are not in a partnership');
    return member;
  }

  private view(secret: SecretMessage, viewerId: string) {
    const opened = secret.senderId === viewerId || secret.revealedAt != null;
    return {
      id: secret.id,
      senderId: secret.senderId,
      kind: secret.kind,
      revealedAt: secret.revealedAt?.toISOString() ?? null,
      body: opened ? secret.body : null,
      imageRef: opened ? secret.imageRef : null,
    };
  }
}
