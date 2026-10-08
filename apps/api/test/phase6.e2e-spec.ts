import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import Redis from 'ioredis';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/main';
import { normalizeDestination } from '../src/identity/destination';
import { PrismaService } from '../src/prisma/prisma.module';

describe('phase 6 web companion', () => {
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
      'TRUNCATE TABLE "status_current", "saved_items", "shared_list_items", "shared_lists", "story_entries", "album_items", "albums", "media_objects", "push_deliveries", "message_receipts", "messages", "secret_messages", "events", "notes", "sessions", "devices", "pair_invites", "partnership_members", "partnerships", "users" RESTART IDENTITY CASCADE',
    );
    await redis.flushdb();
  });

  async function login(destination: string, platform: string) {
    const normalized = normalizeDestination(destination);
    await request(app.getHttpServer()).post('/v1/auth/otp').send({ destination }).expect(201);
    const code = await redis.get(`otp:${normalized}`);
    const response = await request(app.getHttpServer())
      .post('/v1/auth/sessions')
      .send({ destination, code, device: { platform } })
      .expect(201);
    return response.body as { accessToken: string };
  }

  function authed(token: string) {
    const server = app.getHttpServer();
    const header = { Authorization: `Bearer ${token}` };
    return {
      get: (url: string) => request(server).get(url).set(header),
      post: (url: string) => request(server).post(url).set(header),
      patch: (url: string) => request(server).patch(url).set(header),
    };
  }

  it('shows an event edited on the web to the phone', async () => {
    const web = await login('ada@example.com', 'web');
    const phone = await login('bao@example.com', 'ios');
    const invite = await authed(web.accessToken).post('/v1/invites').expect(201);
    await authed(phone.accessToken).post(`/v1/invites/${invite.body.code}/accept`).expect(201);

    const note = await authed(web.accessToken).post('/v1/notes').send({ body: 'ghi trên web' }).expect(201);
    await authed(web.accessToken).patch(`/v1/notes/${note.body.id}`).send({ body: 'đã sửa' }).expect(200);
    const album = await authed(web.accessToken).post('/v1/albums').send({ title: 'Web' }).expect(201);
    await authed(web.accessToken).post('/v1/story-entries').send({ noteId: note.body.id, caption: 'mốc' }).expect(201);
    const event = await authed(phone.accessToken)
      .post('/v1/events')
      .send({ title: 'cũ', startsAt: '2026-12-01T00:00:00.000Z', timezone: 'Asia/Ho_Chi_Minh', kind: 'plan' })
      .expect(201);

    await authed(web.accessToken)
      .patch(`/v1/events/${event.body.id}`)
      .send({ title: 'mới', startsAt: '2026-12-02T00:00:00.000Z', timezone: 'Asia/Ho_Chi_Minh', kind: 'anniversary' })
      .expect(200);

    const onPhone = await authed(phone.accessToken).get('/v1/events').expect(200);
    expect(onPhone.body[0].title).toBe('mới');
    expect(onPhone.body[0].kind).toBe('anniversary');
    const notes = await authed(phone.accessToken).get('/v1/notes').expect(200);
    expect(notes.body[0].body).toBe('đã sửa');
    const albums = await authed(phone.accessToken).get('/v1/albums').expect(200);
    expect(albums.body[0].title).toBe(album.body.title);
    const story = await authed(phone.accessToken).get('/v1/story-entries').expect(200);
    expect(story.body[0].caption).toBe('mốc');
    const thread = await authed(web.accessToken)
      .get(`/v1/partnerships/${(await authed(phone.accessToken).get('/v1/partnership')).body.id}/messages`)
      .expect(200);
    expect(thread.body).toEqual([]);
  });
});
