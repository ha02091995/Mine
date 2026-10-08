import { Injectable } from '@nestjs/common';
import { Message } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { ApiException } from '../common/http';
import { MembershipService } from '../pair/membership.service';
import { PrismaService } from '../prisma/prisma.module';
import { RedisService } from '../redis/redis.module';
import { isFreeSticker } from './stickers';

export interface MessageInput {
  clientMsgId: string;
  kind: 'text' | 'sticker';
  body?: string;
  stickerId?: string;
}

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly redis: RedisService,
  ) {}

  async list(userId: string, partnershipId: string) {
    await this.membership.requireActive(userId, partnershipId);
    const messages = await this.prisma.message.findMany({
      where: { partnershipId },
      orderBy: { createdAt: 'asc' },
      include: { receipts: true },
    });
    return messages.map((message) => this.view(message));
  }

  async create(userId: string, partnershipId: string, input: MessageInput) {
    await this.membership.requireActive(userId, partnershipId);
    if (input.kind === 'text' && !input.body) {
      throw new ApiException(400, 'VALIDATION_ERROR', 'Text messages need a body');
    }
    if (input.kind === 'sticker' && (!input.stickerId || !isFreeSticker(input.stickerId))) {
      throw new ApiException(400, 'UNKNOWN_STICKER', 'Unknown sticker');
    }
    try {
      const message = await this.prisma.message.create({
        data: {
          partnershipId,
          senderId: userId,
          clientMsgId: input.clientMsgId,
          kind: input.kind,
          body: input.body,
          stickerId: input.stickerId,
        },
        include: { receipts: true },
      });
      await this.notifyPartner(partnershipId, userId, message.id);
      await this.redis.client.publish(
        'chat',
        JSON.stringify({
          partnershipId,
          type: 'message.created',
          data: this.view(message),
        }),
      );
      return this.view(message);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.message.findUnique({
          where: { partnershipId_clientMsgId: { partnershipId, clientMsgId: input.clientMsgId } },
        });
        throw new ApiException(409, 'DUPLICATE_MESSAGE', 'Message already sent', { id: existing?.id });
      }
      throw error;
    }
  }

  async markRead(userId: string, partnershipId: string, messageId: string) {
    await this.membership.requireActive(userId, partnershipId);
    const message = await this.prisma.message.findFirst({ where: { id: messageId, partnershipId } });
    if (!message) throw new ApiException(404, 'MESSAGE_NOT_FOUND', 'Message not found');
    const receipt = await this.prisma.messageReceipt.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: { messageId, userId, readAt: new Date() },
      update: { readAt: new Date() },
    });
    await this.redis.client.publish(
      'chat',
      JSON.stringify({
        partnershipId,
        type: 'message.read',
        data: { messageId, userId, readAt: receipt.readAt?.toISOString() },
      }),
    );
    return { messageId, readAt: receipt.readAt?.toISOString() };
  }

  private async notifyPartner(partnershipId: string, senderId: string, messageId: string) {
    const partners = await this.prisma.partnershipMember.findMany({
      where: { partnershipId, status: 'active', userId: { not: senderId } },
    });
    const devices = await this.prisma.device.findMany({
      where: { userId: { in: partners.map((partner) => partner.userId) }, pushToken: { not: null } },
    });
    for (const device of devices) {
      await this.prisma.pushDelivery.create({
        data: { deviceId: device.id, messageId, title: 'Có tin mới', body: '' },
      });
    }
  }

  private view(message: Message & { receipts?: { userId: string; readAt: Date | null }[] }) {
    return {
      id: message.id,
      senderId: message.senderId,
      clientMsgId: message.clientMsgId,
      kind: message.kind,
      body: message.body,
      stickerId: message.stickerId,
      createdAt: message.createdAt.toISOString(),
      reads: (message.receipts ?? [])
        .filter((receipt) => receipt.readAt)
        .map((receipt) => ({ userId: receipt.userId, readAt: receipt.readAt!.toISOString() })),
    };
  }
}
