import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';
import { MembershipService } from '../pair/membership.service';
import { PrismaService } from '../prisma/prisma.module';
import { RedisService } from '../redis/redis.module';

interface AccessPayload {
  sub: string;
  sid: string;
}

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChatGateway.name);
  private subscriber?: Redis;

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit() {
    this.subscriber = this.redis.client.duplicate();
    await this.subscriber.subscribe('chat');
    this.subscriber.on('message', (_channel, raw) => {
      const event = JSON.parse(raw) as { partnershipId: string; type: string; data: unknown };
      this.server.to(`partnership:${event.partnershipId}`).emit(event.type, event.data);
    });
  }

  async onModuleDestroy() {
    await this.subscriber?.quit();
  }

  async handleConnection(client: Socket) {
    try {
      const token = String(client.handshake.auth?.token ?? '');
      const payload = await this.jwt.verifyAsync<AccessPayload>(token);
      const session = await this.prisma.session.findUnique({ where: { id: payload.sid } });
      if (!session || session.revokedAt || session.userId !== payload.sub) {
        client.disconnect();
        return;
      }
      const member = await this.membership.findActive(payload.sub);
      if (!member) {
        client.disconnect();
        return;
      }
      client.data.userId = payload.sub;
      client.data.partnershipId = member.partnershipId;
      await client.join(`partnership:${member.partnershipId}`);
    } catch (error) {
      this.logger.warn('Rejected socket');
      client.disconnect();
    }
  }

  @SubscribeMessage('typing')
  typing(@ConnectedSocket() client: Socket, @MessageBody() body: { active?: boolean }) {
    const partnershipId = client.data.partnershipId as string | undefined;
    const userId = client.data.userId as string | undefined;
    if (!partnershipId || !userId) return;
    client.to(`partnership:${partnershipId}`).emit('typing', { userId, active: Boolean(body?.active) });
  }
}
