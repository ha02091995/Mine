import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
export class NotifyService {
  constructor(private readonly prisma: PrismaService) {}

  async deliverDue(partnershipId: string) {
    const events = await this.prisma.event.findMany({
      where: { partnershipId, remindOffsetMinutes: { not: null } },
    });
    const now = Date.now();
    for (const event of events) {
      const dueAt = event.startsAt.getTime() - (event.remindOffsetMinutes ?? 0) * 60_000;
      if (dueAt > now) continue;
      const partners = await this.prisma.partnershipMember.findMany({
        where: { partnershipId, status: 'active', userId: { not: event.authorId } },
      });
      if (partners.length === 0) continue;
      const devices = await this.prisma.device.findMany({
        where: {
          userId: { in: partners.map((partner) => partner.userId) },
          pushToken: { not: null },
        },
      });
      for (const device of devices) {
        try {
          await this.prisma.pushDelivery.create({
            data: {
              deviceId: device.id,
              eventId: event.id,
              title: event.title,
              body: '',
            },
          });
        } catch (error) {
          if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
            throw error;
          }
        }
      }
    }
  }
}
