import { Injectable } from '@nestjs/common';
import { ApiException } from '../common/http';
import { MembershipService } from '../pair/membership.service';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
export class NotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
  ) {}

  async list(userId: string) {
    const member = await this.requirePair(userId);
    const notes = await this.prisma.note.findMany({
      where: { partnershipId: member.partnershipId },
      orderBy: { createdAt: 'asc' },
    });
    return notes.map((note) => this.view(note));
  }

  async create(userId: string, body: string) {
    const member = await this.requirePair(userId);
    const note = await this.prisma.note.create({
      data: { partnershipId: member.partnershipId, authorId: userId, body },
    });
    return this.view(note);
  }

  async update(userId: string, noteId: string, body: string) {
    const member = await this.requirePair(userId);
    const note = await this.prisma.note.findFirst({
      where: { id: noteId, partnershipId: member.partnershipId },
    });
    if (!note) throw new ApiException(404, 'NOTE_NOT_FOUND', 'Note not found');
    const updated = await this.prisma.note.update({ where: { id: noteId }, data: { body } });
    return this.view(updated);
  }

  private async requirePair(userId: string) {
    const member = await this.membership.findActive(userId);
    if (!member) throw new ApiException(404, 'PARTNERSHIP_NOT_FOUND', 'You are not in a partnership');
    return member;
  }

  private view(note: { id: string; authorId: string; body: string; updatedAt: Date }) {
    return {
      id: note.id,
      authorId: note.authorId,
      body: note.body,
      updatedAt: note.updatedAt.toISOString(),
    };
  }
}
