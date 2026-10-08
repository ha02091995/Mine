import { createHmac, timingSafeEqual } from 'crypto';
import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiException } from '../common/http';
import { MembershipService } from '../pair/membership.service';
import { PrismaService } from '../prisma/prisma.module';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 8 * 1024 * 1024;
const TTL_SECONDS = 600;

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly config: ConfigService,
  ) {}

  async createUpload(userId: string, contentType: string) {
    if (!ALLOWED.has(contentType)) {
      throw new ApiException(400, 'UNSUPPORTED_TYPE', 'Upload image/jpeg, image/png, or image/webp');
    }
    const member = await this.requirePair(userId);
    const media = await this.prisma.mediaObject.create({
      data: {
        partnershipId: member.partnershipId,
        ownerId: userId,
        contentType,
      },
    });
    const expires = Math.floor(Date.now() / 1000) + TTL_SECONDS;
    return {
      id: media.id,
      uploadUrl: this.signedPath('PUT', media.id, expires),
      expiresAt: new Date(expires * 1000).toISOString(),
    };
  }

  async save(id: string, expires: string, sig: string, body: Buffer, contentType: string | undefined) {
    this.verify('PUT', id, expires, sig);
    const media = await this.prisma.mediaObject.findUnique({ where: { id } });
    if (!media || media.deletedAt) throw new ApiException(404, 'MEDIA_NOT_FOUND', 'Media not found');
    if (contentType && contentType !== media.contentType) {
      throw new ApiException(400, 'TYPE_MISMATCH', 'Content type does not match the upload');
    }
    if (body.length === 0 || body.length > MAX_BYTES) {
      throw new ApiException(400, 'INVALID_SIZE', 'Image must be between 1 byte and 8 MB');
    }
    await mkdir(this.dir(), { recursive: true });
    await writeFile(this.path(id), body);
    await this.prisma.mediaObject.update({ where: { id }, data: { byteSize: body.length } });
    return { id, byteSize: body.length };
  }

  async read(id: string, expires: string, sig: string) {
    this.verify('GET', id, expires, sig);
    const media = await this.prisma.mediaObject.findUnique({ where: { id } });
    if (!media || media.deletedAt) throw new ApiException(404, 'MEDIA_NOT_FOUND', 'Media not found');
    try {
      const bytes = await readFile(this.path(id));
      return { bytes, contentType: media.contentType };
    } catch {
      throw new ApiException(404, 'MEDIA_NOT_FOUND', 'Media not found');
    }
  }

  async remove(userId: string, id: string) {
    const member = await this.requirePair(userId);
    const media = await this.prisma.mediaObject.findFirst({
      where: { id, partnershipId: member.partnershipId },
    });
    if (!media) throw new ApiException(404, 'MEDIA_NOT_FOUND', 'Media not found');
    await this.prisma.mediaObject.update({ where: { id }, data: { deletedAt: new Date(), byteSize: null } });
    await rm(this.path(id), { force: true });
    return { id, deleted: true };
  }

  signedGet(id: string) {
    const expires = Math.floor(Date.now() / 1000) + TTL_SECONDS;
    return this.signedPath('GET', id, expires);
  }

  private signedPath(method: string, id: string, expires: number) {
    const sig = this.sign(method, id, expires);
    return `/v1/media/${id}/content?expires=${expires}&sig=${sig}`;
  }

  private sign(method: string, id: string, expires: number) {
    return createHmac('sha256', this.secret()).update(`${method}:${id}:${expires}`).digest('base64url');
  }

  private verify(method: string, id: string, expiresRaw: string, sig: string) {
    const expires = Number(expiresRaw);
    if (!Number.isFinite(expires) || !sig) {
      throw new ApiException(403, 'BAD_SIGNATURE', 'Missing signature');
    }
    if (Math.floor(Date.now() / 1000) > expires) {
      throw new ApiException(403, 'URL_EXPIRED', 'Signed URL expired');
    }
    const expected = this.sign(method, id, expires);
    const left = Buffer.from(expected);
    const right = Buffer.from(sig);
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      throw new ApiException(403, 'BAD_SIGNATURE', 'Invalid signature');
    }
  }

  private dir() {
    return this.config.get<string>('MEDIA_DIR') || './data/media';
  }

  private path(id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ApiException(400, 'VALIDATION_ERROR', 'Invalid media id');
    return join(this.dir(), id);
  }

  private secret() {
    return this.config.getOrThrow<string>('MEDIA_SECRET');
  }

  private async requirePair(userId: string) {
    const member = await this.membership.findActive(userId);
    if (!member) throw new ApiException(404, 'PARTNERSHIP_NOT_FOUND', 'You are not in a partnership');
    return member;
  }
}
