import { access } from 'fs/promises';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import Redis from 'ioredis';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/main';
import { normalizeDestination } from '../src/identity/destination';
import { PrismaService } from '../src/prisma/prisma.module';

describe('phase 3 albums and story', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: Redis;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    redis = new Redis(process.env.REDIS_URL as string);
  });

  afterAll(async () => {
    await redis.quit();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "story_entries", "album_items", "albums", "media_objects", "push_deliveries", "message_receipts", "messages", "secret_messages", "events", "notes", "sessions", "devices", "pair_invites", "partnership_members", "partnerships", "users" RESTART IDENTITY CASCADE',
    );
    await redis.flushdb();
  });

  async function login(destination: string) {
    const normalized = normalizeDestination(destination);
    await request(app.getHttpServer()).post('/v1/auth/otp').send({ destination }).expect(201);
    const code = await redis.get(`otp:${normalized}`);
    const response = await request(app.getHttpServer())
      .post('/v1/auth/sessions')
      .send({ destination, code, device: { platform: 'test' } })
      .expect(201);
    return response.body as { accessToken: string; user: { id: string } };
  }

  function authed(token: string) {
    const server = app.getHttpServer();
    const header = { Authorization: `Bearer ${token}` };
    return {
      get: (url: string) => request(server).get(url).set(header),
      post: (url: string) => request(server).post(url).set(header),
      put: (url: string) => request(server).put(url).set(header),
      delete: (url: string) => request(server).delete(url).set(header),
    };
  }

  async function pair(left: string, right: string) {
    const a = await login(left);
    const b = await login(right);
    const invite = await authed(a.accessToken).post('/v1/invites').expect(201);
    await authed(b.accessToken).post(`/v1/invites/${invite.body.code}/accept`).expect(201);
    return { a, b };
  }

  async function upload(token: string, bytes: Buffer) {
    const created = await authed(token).post('/v1/media/uploads').send({ contentType: 'image/jpeg' }).expect(201);
    await request(app.getHttpServer())
      .put(created.body.uploadUrl)
      .set('Content-Type', 'image/jpeg')
      .send(bytes)
      .expect(200);
    return created.body as { id: string; uploadUrl: string };
  }

  it('removes the object and rejects the old signed URL after delete', async () => {
    const { a } = await pair('ada@example.com', 'bao@example.com');
    const bytes = Buffer.from('jpeg-bytes');
    const media = await upload(a.accessToken, bytes);
    const album = await authed(a.accessToken).post('/v1/albums').send({ title: 'Hè' }).expect(201);
    const item = await authed(a.accessToken)
      .post(`/v1/albums/${album.body.id}/items`)
      .send({ mediaId: media.id, caption: 'biển' })
      .expect(201);

    const before = await request(app.getHttpServer()).get(item.body.downloadUrl).expect(200);
    expect(before.body).toEqual(bytes);

    await authed(a.accessToken).delete(`/v1/media/${media.id}`).expect(200);
    await request(app.getHttpServer()).get(item.body.downloadUrl).expect(404);
    await expect(access(`${process.env.MEDIA_DIR}/${media.id}`)).rejects.toThrow();
    const stored = await prisma.mediaObject.findUniqueOrThrow({ where: { id: media.id } });
    expect(stored.deletedAt).not.toBeNull();
  });

  it('keeps one pair story out of the other pair', async () => {
    const first = await pair('ada@example.com', 'bao@example.com');
    const second = await pair('cam@example.com', 'dai@example.com');
    const note = await authed(first.a.accessToken).post('/v1/notes').send({ body: 'ngày đầu' }).expect(201);
    await authed(first.a.accessToken)
      .post('/v1/story-entries')
      .send({ noteId: note.body.id, caption: 'mốc', position: 0 })
      .expect(201);

    const own = await authed(first.b.accessToken).get('/v1/story-entries').expect(200);
    expect(own.body).toHaveLength(1);
    expect(own.body[0].noteBody).toBe('ngày đầu');

    const other = await authed(second.a.accessToken).get('/v1/story-entries').expect(200);
    expect(other.body).toEqual([]);
    const albums = await authed(second.a.accessToken).get('/v1/albums').expect(200);
    expect(albums.body).toEqual([]);
  });
});
