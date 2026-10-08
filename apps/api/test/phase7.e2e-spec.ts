import { access } from 'fs/promises';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import Redis from 'ioredis';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/main';
import { normalizeDestination } from '../src/identity/destination';
import { PrismaService } from '../src/prisma/prisma.module';

describe('phase 7 stickers export and deletion', () => {
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
      'TRUNCATE TABLE "deletion_jobs", "sticker_entitlements", "status_current", "saved_items", "shared_list_items", "shared_lists", "story_entries", "album_items", "albums", "media_objects", "push_deliveries", "message_receipts", "messages", "secret_messages", "events", "notes", "sessions", "devices", "pair_invites", "partnership_members", "partnerships", "users" RESTART IDENTITY CASCADE',
    );
    await redis.flushdb();
  });

  async function login(destination: string, pushToken?: string) {
    const normalized = normalizeDestination(destination);
    await request(app.getHttpServer()).post('/v1/auth/otp').send({ destination }).expect(201);
    const code = await redis.get(`otp:${normalized}`);
    const response = await request(app.getHttpServer())
      .post('/v1/auth/sessions')
      .send({ destination, code, device: { platform: 'test', pushToken } })
      .expect(201);
    return response.body as { accessToken: string; refreshToken: string; user: { id: string } };
  }

  function authed(token: string) {
    const server = app.getHttpServer();
    const header = { Authorization: `Bearer ${token}` };
    return {
      get: (url: string) => request(server).get(url).set(header),
      post: (url: string) => request(server).post(url).set(header),
    };
  }

  async function pair() {
    const ada = await login('ada@example.com', 'push-ada');
    const bao = await login('bao@example.com', 'push-bao');
    const invite = await authed(ada.accessToken).post('/v1/invites').expect(201);
    const partnership = await authed(bao.accessToken).post(`/v1/invites/${invite.body.code}/accept`).expect(201);
    return { ada, bao, partnershipId: partnership.body.id as string };
  }

  it('keeps the free pack and unlocks a downloaded pack', async () => {
    const { ada, partnershipId } = await pair();
    const catalog = await authed(ada.accessToken).get('/v1/stickers').expect(200);
    expect(catalog.body.free).toEqual(expect.arrayContaining(['heart', 'kiss', 'hug']));
    expect(catalog.body.packs[0].owned).toBe(false);

    await authed(ada.accessToken)
      .post(`/v1/partnerships/${partnershipId}/messages`)
      .send({ clientMsgId: 'free-1', kind: 'sticker', stickerId: 'heart' })
      .expect(201);
    await authed(ada.accessToken)
      .post(`/v1/partnerships/${partnershipId}/messages`)
      .send({ clientMsgId: 'locked-1', kind: 'sticker', stickerId: 'spark' })
      .expect(403);

    await authed(ada.accessToken).post('/v1/sticker-packs/extra').expect(201);
    await authed(ada.accessToken)
      .post(`/v1/partnerships/${partnershipId}/messages`)
      .send({ clientMsgId: 'extra-1', kind: 'sticker', stickerId: 'spark' })
      .expect(201);
  });

  it('exports expiring image URLs and deletes the account', async () => {
    const { ada, bao, partnershipId } = await pair();
    await authed(ada.accessToken).post('/v1/notes').send({ body: 'để lại' }).expect(201);
    const created = await authed(ada.accessToken).post('/v1/media/uploads').send({ contentType: 'image/jpeg' }).expect(201);
    const bytes = Buffer.from('jpeg-bytes');
    await request(app.getHttpServer()).put(created.body.uploadUrl).set('Content-Type', 'image/jpeg').send(bytes).expect(200);
    const album = await authed(ada.accessToken).post('/v1/albums').send({ title: 'Xuất' }).expect(201);
    await authed(ada.accessToken)
      .post(`/v1/albums/${album.body.id}/items`)
      .send({ mediaId: created.body.id, caption: 'ảnh' })
      .expect(201);

    const exported = await authed(ada.accessToken).get('/v1/me/export').expect(200);
    expect(exported.body.notes[0].body).toBe('để lại');
    const downloadUrl = exported.body.images[0].downloadUrl as string;
    expect(downloadUrl).toContain('sig=');
    await request(app.getHttpServer()).get(downloadUrl).expect(200);

    const removed = await authed(ada.accessToken).post('/v1/me/deletion').expect(201);
    expect(removed.body.queuedImages).toBe(1);
    await request(app.getHttpServer()).get(downloadUrl).expect(404);
    await expect(access(`${process.env.MEDIA_DIR}/${created.body.id}`)).rejects.toThrow();
    const job = await prisma.deletionJob.findFirstOrThrow({ where: { mediaId: created.body.id } });
    expect(job.status).toBe('done');

    await authed(ada.accessToken).get('/v1/notes').expect(401);
    await request(app.getHttpServer()).post('/v1/auth/sessions/refresh').send({ refreshToken: ada.refreshToken }).expect(401);
    const device = await prisma.device.findFirstOrThrow({ where: { userId: ada.user.id } });
    expect(device.pushToken).toBeNull();
    const partnership = await prisma.partnership.findUniqueOrThrow({ where: { id: partnershipId } });
    expect(partnership.status).toBe('closed');
    await authed(bao.accessToken).get('/v1/partnership').expect(404);
  });
});
