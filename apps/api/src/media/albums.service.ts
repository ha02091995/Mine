import { Injectable } from '@nestjs/common';
import { ApiException } from '../common/http';
import { MembershipService } from '../pair/membership.service';
import { PrismaService } from '../prisma/prisma.module';
import { MediaService } from './media.service';

@Injectable()
export class AlbumsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly media: MediaService,
  ) {}

  async list(userId: string) {
    const member = await this.requirePair(userId);
    const albums = await this.prisma.album.findMany({
      where: { partnershipId: member.partnershipId },
      orderBy: { createdAt: 'asc' },
      include: { items: { orderBy: { createdAt: 'asc' }, include: { media: true } } },
    });
    return albums.map((album) => ({
      id: album.id,
      title: album.title,
      items: album.items.map((item) => ({
        id: item.id,
        mediaId: item.mediaId,
        caption: item.caption,
        downloadUrl: item.media.deletedAt ? null : this.media.signedGet(item.mediaId),
      })),
    }));
  }

  async create(userId: string, title: string) {
    const member = await this.requirePair(userId);
    const album = await this.prisma.album.create({
      data: { partnershipId: member.partnershipId, title },
    });
    return { id: album.id, title: album.title, items: [] };
  }

  async addItem(userId: string, albumId: string, mediaId: string, caption: string) {
    const member = await this.requirePair(userId);
    const album = await this.prisma.album.findFirst({
      where: { id: albumId, partnershipId: member.partnershipId },
    });
    if (!album) throw new ApiException(404, 'ALBUM_NOT_FOUND', 'Album not found');
    const media = await this.prisma.mediaObject.findFirst({
      where: { id: mediaId, partnershipId: member.partnershipId, deletedAt: null, byteSize: { not: null } },
    });
    if (!media) throw new ApiException(404, 'MEDIA_NOT_FOUND', 'Upload the image before adding it');
    const item = await this.prisma.albumItem.create({
      data: { albumId, mediaId, caption },
    });
    return {
      id: item.id,
      mediaId: item.mediaId,
      caption: item.caption,
      downloadUrl: this.media.signedGet(mediaId),
    };
  }

  private async requirePair(userId: string) {
    const member = await this.membership.findActive(userId);
    if (!member) throw new ApiException(404, 'PARTNERSHIP_NOT_FOUND', 'You are not in a partnership');
    return member;
  }
}
