import { Injectable } from '@nestjs/common';
import { ApiException } from '../common/http';
import { MediaService } from '../media/media.service';
import { MembershipService } from '../pair/membership.service';
import { PrismaService } from '../prisma/prisma.module';
import { EXTRA_PACKS, FREE_STICKERS } from '../chat/stickers';

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly media: MediaService,
  ) {}

  async stickers(userId: string) {
    const owned = await this.prisma.stickerEntitlement.findMany({ where: { userId } });
    const packs = new Set(owned.map((row) => row.packId));
    return {
      free: [...FREE_STICKERS],
      packs: Object.entries(EXTRA_PACKS).map(([id, stickers]) => ({
        id,
        stickers: [...stickers],
        owned: packs.has(id),
      })),
    };
  }

  async claimPack(userId: string, packId: string) {
    if (!EXTRA_PACKS[packId]) throw new ApiException(404, 'PACK_NOT_FOUND', 'Sticker pack not found');
    const row = await this.prisma.stickerEntitlement.upsert({
      where: { userId_packId: { userId, packId } },
      create: { userId, packId },
      update: {},
    });
    return { packId: row.packId, owned: true };
  }

  async export(userId: string) {
    const member = await this.membership.findActive(userId);
    if (!member) throw new ApiException(404, 'PARTNERSHIP_NOT_FOUND', 'You are not in a partnership');
    const [notes, events, messages, albums, media] = await Promise.all([
      this.prisma.note.findMany({ where: { partnershipId: member.partnershipId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.event.findMany({ where: { partnershipId: member.partnershipId }, orderBy: { startsAt: 'asc' } }),
      this.prisma.message.findMany({ where: { partnershipId: member.partnershipId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.album.findMany({
        where: { partnershipId: member.partnershipId },
        include: { items: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.mediaObject.findMany({
        where: { partnershipId: member.partnershipId, deletedAt: null, byteSize: { not: null } },
      }),
    ]);
    return {
      notes: notes.map((note) => ({ id: note.id, body: note.body })),
      events: events.map((event) => ({ id: event.id, title: event.title, startsAt: event.startsAt.toISOString() })),
      messages: messages.map((message) => ({ id: message.id, kind: message.kind, body: message.body })),
      albums: albums.map((album) => ({
        id: album.id,
        title: album.title,
        items: album.items.map((item) => ({
          mediaId: item.mediaId,
          caption: item.caption,
          downloadUrl: this.media.signedGet(item.mediaId),
        })),
      })),
      images: media.map((item) => ({ id: item.id, downloadUrl: this.media.signedGet(item.id) })),
    };
  }

  async deleteAccount(userId: string) {
    const member = await this.membership.findActive(userId);
    await this.prisma.$transaction(async (tx) => {
      if (member) {
        await tx.partnership.update({
          where: { id: member.partnershipId },
          data: { status: 'closed', closedAt: new Date() },
        });
        await tx.partnershipMember.updateMany({
          where: { partnershipId: member.partnershipId, status: 'active' },
          data: { status: 'left' },
        });
      }
      await tx.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.device.updateMany({ where: { userId }, data: { pushToken: null } });
      await tx.user.update({ where: { id: userId }, data: { deletedAt: new Date() } });
    });
    const queued = await this.media.queueOwnedDeletions(userId);
    return { deleted: true, queuedImages: queued };
  }
}
