import { Injectable } from '@nestjs/common';
import { Event } from '@prisma/client';
import { ApiException } from '../common/http';
import { NotifyService } from '../notify/notify.service';
import { MembershipService } from '../pair/membership.service';
import { PrismaService } from '../prisma/prisma.module';

export interface EventInput {
  title: string;
  startsAt: string;
  timezone: string;
  kind: 'anniversary' | 'birthday' | 'plan';
  remindOffsetMinutes?: number;
}

@Injectable()
export class DatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly notify: NotifyService,
  ) {}

  async list(userId: string) {
    const member = await this.requirePair(userId);
    const events = await this.prisma.event.findMany({
      where: { partnershipId: member.partnershipId },
      orderBy: { startsAt: 'asc' },
    });
    return events.map((event) => this.view(event));
  }

  async create(userId: string, input: EventInput) {
    const member = await this.requirePair(userId);
    const event = await this.prisma.event.create({
      data: {
        partnershipId: member.partnershipId,
        authorId: userId,
        title: input.title,
        startsAt: new Date(input.startsAt),
        timezone: input.timezone,
        kind: input.kind,
        remindOffsetMinutes: input.remindOffsetMinutes,
      },
    });
    await this.notify.deliverDue(member.partnershipId);
    return this.view(event);
  }

  private async requirePair(userId: string) {
    const member = await this.membership.findActive(userId);
    if (!member) throw new ApiException(404, 'PARTNERSHIP_NOT_FOUND', 'You are not in a partnership');
    return member;
  }

  private view(event: Event) {
    const ms = event.startsAt.getTime() - Date.now();
    return {
      id: event.id,
      authorId: event.authorId,
      title: event.title,
      startsAt: event.startsAt.toISOString(),
      timezone: event.timezone,
      kind: event.kind,
      remindOffsetMinutes: event.remindOffsetMinutes,
      countdownDays: Math.ceil(ms / 86_400_000),
    };
  }
}
