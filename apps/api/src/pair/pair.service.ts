import { Injectable } from '@nestjs/common';
import { Partnership, User } from '@prisma/client';
import { inviteCode } from '../common/crypto';
import { daysTogether, isoDate, utcToday } from '../common/dates';
import { ApiException } from '../common/http';
import { isUniqueViolation } from '../identity/identity.service';
import { PrismaService } from '../prisma/prisma.module';
import { MembershipService } from './membership.service';

const INVITE_MS = 48 * 60 * 60 * 1000;

type MemberWithUser = { user: User };

@Injectable()
export class PairService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
  ) {}

  async createInvite(userId: string) {
    if (await this.membership.findActive(userId)) {
      throw new ApiException(409, 'ALREADY_PAIRED', 'Leave your current partnership before inviting someone new');
    }
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const invite = await this.prisma.pairInvite.create({
          data: {
            code: inviteCode(),
            creatorId: userId,
            expiresAt: new Date(Date.now() + INVITE_MS),
          },
        });
        return { code: invite.code, expiresAt: invite.expiresAt.toISOString() };
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
      }
    }
    throw new ApiException(500, 'INVITE_FAILED', 'Could not create an invite');
  }

  async accept(userId: string, rawCode: string) {
    const code = rawCode.trim().toUpperCase();
    const partnership = await this.prisma.$transaction(async (tx) => {
      const invite = await tx.pairInvite.findUnique({ where: { code } });
      if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
        throw new ApiException(410, 'INVITE_UNUSABLE', 'Invite is expired or already used');
      }
      if (invite.creatorId === userId) {
        throw new ApiException(400, 'INVITE_SELF', 'You cannot accept your own invite');
      }
      const blocked = await tx.partnershipMember.findFirst({
        where: {
          status: 'active',
          userId: { in: [invite.creatorId, userId] },
          partnership: { status: 'active' },
        },
      });
      if (blocked) {
        throw new ApiException(409, 'ALREADY_PAIRED', 'One of you already has a partnership');
      }
      const created = await tx.partnership.create({
        data: {
          startedOn: utcToday(),
          status: 'active',
          members: {
            create: [
              { userId: invite.creatorId, status: 'active' },
              { userId, status: 'active' },
            ],
          },
        },
        include: { members: { include: { user: true }, orderBy: { createdAt: 'asc' } } },
      });
      const marked = await tx.pairInvite.updateMany({
        where: { id: invite.id, usedAt: null },
        data: { usedAt: new Date(), partnershipId: created.id },
      });
      if (marked.count !== 1) {
        throw new ApiException(410, 'INVITE_UNUSABLE', 'Invite is expired or already used');
      }
      return created;
    });
    return this.view(partnership, partnership.members);
  }

  async getForUser(userId: string) {
    const member = await this.membership.findActive(userId);
    if (!member) {
      throw new ApiException(404, 'PARTNERSHIP_NOT_FOUND', 'You are not in a partnership');
    }
    const members = await this.prisma.partnershipMember.findMany({
      where: { partnershipId: member.partnershipId, status: 'active' },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
    return this.view(member.partnership, members);
  }

  async updateStartedOn(userId: string, startedOn: string) {
    const member = await this.membership.findActive(userId);
    if (!member) {
      throw new ApiException(404, 'PARTNERSHIP_NOT_FOUND', 'You are not in a partnership');
    }
    const [year, month, day] = startedOn.split('-').map(Number);
    const partnership = await this.prisma.partnership.update({
      where: { id: member.partnershipId },
      data: { startedOn: new Date(Date.UTC(year, month - 1, day)) },
    });
    const members = await this.prisma.partnershipMember.findMany({
      where: { partnershipId: partnership.id, status: 'active' },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
    return this.view(partnership, members);
  }

  async leave(userId: string, partnershipId: string) {
    await this.membership.requireActive(userId, partnershipId);
    await this.prisma.$transaction([
      this.prisma.partnership.update({
        where: { id: partnershipId },
        data: { status: 'closed', closedAt: new Date() },
      }),
      this.prisma.partnershipMember.updateMany({
        where: { partnershipId, status: 'active' },
        data: { status: 'left' },
      }),
    ]);
    return { status: 'closed' as const };
  }

  view(partnership: Partnership, members: MemberWithUser[]) {
    return {
      id: partnership.id,
      status: partnership.status,
      startedOn: isoDate(partnership.startedOn),
      daysTogether: daysTogether(partnership.startedOn),
      members: members.map((member) => ({
        userId: member.user.id,
        displayName: member.user.displayName,
      })),
    };
  }
}
