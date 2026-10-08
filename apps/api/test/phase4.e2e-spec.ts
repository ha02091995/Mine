import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import Redis from 'ioredis';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/main';
import { normalizeDestination } from '../src/identity/destination';
import { PrismaService } from '../src/prisma/prisma.module';

describe('phase 4 lists and discover', () => {
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
      'TRUNCATE TABLE "saved_items", "shared_list_items", "shared_lists", "story_entries", "album_items", "albums", "media_objects", "push_deliveries", "message_receipts", "messages", "secret_messages", "events", "notes", "sessions", "devices", "pair_invites", "partnership_members", "partnerships", "users" RESTART IDENTITY CASCADE',
    );
    await redis.flushdb();
    await prisma.discoverPlace.deleteMany({
      where: { title: { notIn: ['Hồ Gươm', 'Nhà thờ Đức Bà'] } },
    });
  });

  async function login(destination: string) {
    const normalized = normalizeDestination(destination);
    await request(app.getHttpServer()).post('/v1/auth/otp').send({ destination }).expect(201);
    const code = await redis.get(`otp:${normalized}`);
    const response = await request(app.getHttpServer())
      .post('/v1/auth/sessions')
      .send({ destination, code, device: { platform: 'test' } })
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

  async function pair(left: string, right: string) {
    const a = await login(left);
    const b = await login(right);
    const invite = await authed(a.accessToken).post('/v1/invites').expect(201);
    await authed(b.accessToken).post(`/v1/invites/${invite.body.code}/accept`).expect(201);
    return { a, b };
  }

  it('shows a catalog row added on the server for the declared city', async () => {
    const { a, b } = await pair('ada@example.com', 'bao@example.com');
    const other = await pair('cam@example.com', 'dai@example.com');
    await authed(a.accessToken).patch('/v1/me').send({ city: 'Hà Nội' }).expect(200);
    const before = await authed(a.accessToken).get('/v1/discover').expect(200);
    expect(before.body.map((place: { title: string }) => place.title)).toEqual(['Hồ Gươm']);
    expect(JSON.stringify(before.body)).not.toMatch(/lat|lng|latitude|longitude/i);

    await prisma.discoverPlace.create({
      data: { city: 'Hà Nội', title: 'Phố sách', summary: 'Mở cuối tuần' },
    });
    const after = await authed(b.accessToken).get('/v1/discover').expect(200);
    expect(after.body.map((place: { title: string }) => place.title)).toEqual([]);

    await authed(b.accessToken).patch('/v1/me').send({ city: 'Hà Nội' }).expect(200);
    const partner = await authed(b.accessToken).get('/v1/discover').expect(200);
    expect(partner.body.map((place: { title: string }) => place.title).sort()).toEqual(['Hồ Gươm', 'Phố sách']);

    await authed(other.a.accessToken).patch('/v1/me').send({ city: 'Hồ Chí Minh' }).expect(200);
    const south = await authed(other.a.accessToken).get('/v1/discover').expect(200);
    expect(south.body.map((place: { title: string }) => place.title)).toEqual(['Nhà thờ Đức Bà']);
  });

  it('checks off a shared list item and saves a place into the pair', async () => {
    const { a, b } = await pair('ada@example.com', 'bao@example.com');
    const outsider = await pair('cam@example.com', 'dai@example.com');
    const list = await authed(a.accessToken).post('/v1/lists').send({ title: 'Cuối tuần' }).expect(201);
    const item = await authed(a.accessToken)
      .post(`/v1/lists/${list.body.id}/items`)
      .send({ body: 'mua hoa' })
      .expect(201);
    await authed(b.accessToken).patch(`/v1/lists/${list.body.id}/items/${item.body.id}`).send({ done: true }).expect(200);
    const seen = await authed(a.accessToken).get('/v1/lists').expect(200);
    expect(seen.body[0].items[0].done).toBe(true);
    const hidden = await authed(outsider.a.accessToken).get('/v1/lists').expect(200);
    expect(hidden.body).toEqual([]);

    await authed(a.accessToken).patch('/v1/me').send({ city: 'Hà Nội' }).expect(200);
    const places = await authed(a.accessToken).get('/v1/discover').expect(200);
    await authed(a.accessToken).post('/v1/saved-items').send({ placeId: places.body[0].id }).expect(201);
    const saved = await authed(b.accessToken).get('/v1/saved-items').expect(200);
    expect(saved.body[0].title).toBe('Hồ Gươm');
    const otherSaved = await authed(outsider.a.accessToken).get('/v1/saved-items').expect(200);
    expect(otherSaved.body).toEqual([]);
  });
});
