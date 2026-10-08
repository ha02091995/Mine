import { Injectable } from '@nestjs/common';
import { ApiException } from '../common/http';
import { MembershipService } from '../pair/membership.service';
import { PrismaService } from '../prisma/prisma.module';
import { MediaService } from './media.service';

export interface StoryInput {
  noteId?: string;
  mediaId?: string;
  caption: string;
  position?: number;
}

@Injectable()
export class StoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly media: MediaService,
  ) {}

  async list(userId: string) {
    const member = await this.requirePair(userId);
    const entries = await this.prisma.storyEntry.findMany({
      where: { partnershipId: member.partnershipId },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      include: { media: true, note: true },
    });
    return entries.map((entry) => this.view(entry));
  }

  async create(userId: string, input: StoryInput) {
    if (Boolean(input.noteId) === Boolean(input.mediaId)) {
      throw new ApiException(400, 'VALIDATION_ERROR', 'A story entry needs a note or an image, not both');
    }
    const member = await this.requirePair(userId);
    if (input.noteId) {
      const note = await this.prisma.note.findFirst({
        where: { id: input.noteId, partnershipId: member.partnershipId },
      });
      if (!note) throw new ApiException(404, 'NOTE_NOT_FOUND', 'Note not found');
    }
    if (input.mediaId) {
      const media = await this.prisma.mediaObject.findFirst({
        where: { id: input.mediaId, partnershipId: member.partnershipId, deletedAt: null },
      });
      if (!media) throw new ApiException(404, 'MEDIA_NOT_FOUND', 'Media not found');
    }
    const latest = await this.prisma.storyEntry.findFirst({
      where: { partnershipId: member.partnershipId },
      orderBy: { position: 'desc' },
    });
    const entry = await this.prisma.storyEntry.create({
      data: {
        partnershipId: member.partnershipId,
        authorId: userId,
        position: input.position ?? (latest ? latest.position + 1 : 0),
        noteId: input.noteId,
        mediaId: input.mediaId,
        caption: input.caption,
      },
      include: { media: true, note: true },
    });
    return this.view(entry);
  }

  private view(entry: {
    id: string;
    position: number;
    caption: string;
    noteId: string | null;
    mediaId: string | null;
    note: { body: string } | null;
    media: { deletedAt: Date | null } | null;
  }) {
    return {
      id: entry.id,
      position: entry.position,
      caption: entry.caption,
      noteId: entry.noteId,
      noteBody: entry.note?.body ?? null,
      mediaId: entry.media?.deletedAt ? null : entry.mediaId,
      downloadUrl: entry.mediaId && !entry.media?.deletedAt ? this.media.signedGet(entry.mediaId) : null,
    };
  }

  private async requirePair(userId: string) {
    const member = await this.membership.findActive(userId);
    if (!member) throw new ApiException(404, 'PARTNERSHIP_NOT_FOUND', 'You are not in a partnership');
    return member;
  }
}
