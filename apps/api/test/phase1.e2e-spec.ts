import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import Redis from 'ioredis';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/main';
import { PrismaService } from '../src/prisma/prisma.module';
import { normalizeDestination } from '../src/identity/destination';

describe('phase 1 profile notes and dates', () => {
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
      'TRUNCATE TABLE "push_deliveries", "events", "notes", "sessions", "devices", "pair_invites", "partnership_members", "partnerships", "users" RESTART IDENTITY CASCADE',
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
    return response.body as {
      accessToken: string;
      user: { id: string };
    };
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

  async function pair() {
    const ada = await login('ada@example.com', 'token-ada');
    const bao = await login('bao@example.com', 'token-bao');
    const invite = await authed(ada.accessToken).post('/v1/invites').expect(201);
    await authed(bao.accessToken).post(`/v1/invites/${invite.body.code}/accept`).expect(201);
    return { ada, bao };
  }

  it('shares the started date, notes, and a countdown', async () => {
    const { ada, bao } = await pair();
    const today = new Date();
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 10));
    const startedOn = start.toISOString().slice(0, 10);
    const updated = await authed(ada.accessToken).patch('/v1/partnership').send({ startedOn }).expect(200);
    expect(updated.body.daysTogether).toBe(11);
    const seen = await authed(bao.accessToken).get('/v1/partnership').expect(200);
    expect(seen.body.daysTogether).toBe(11);

    const note = await authed(ada.accessToken).post('/v1/notes').send({ body: 'Nhớ mang áo mưa' }).expect(201);
    const listed = await authed(bao.accessToken).get('/v1/notes').expect(200);
    expect(listed.body).toEqual([expect.objectContaining({ id: note.body.id, body: 'Nhớ mang áo mưa' })]);
    await authed(bao.accessToken).patch(`/v1/notes/${note.body.id}`).send({ body: 'Đã nhớ' }).expect(200);
    const after = await authed(ada.accessToken).get('/v1/notes').expect(200);
    expect(after.body[0].body).toBe('Đã nhớ');

    const startsAt = new Date(Date.now() + 3 * 86_400_000).toISOString();
    await authed(ada.accessToken)
      .post('/v1/events')
      .send({
        title: 'Kỷ niệm',
        startsAt,
        timezone: 'Asia/Ho_Chi_Minh',
        kind: 'anniversary',
        remindOffsetMinutes: 60,
      })
      .expect(201);
    const events = await authed(bao.accessToken).get('/v1/events').expect(200);
    expect(events.body[0].title).toBe('Kỷ niệm');
    expect(events.body[0].countdownDays).toBe(3);
  });

  it('sends a due reminder only to the partner device', async () => {
    const { ada, bao } = await pair();
    await authed(ada.accessToken)
      .post('/v1/events')
      .send({
        title: 'Sinh nhật',
        startsAt: new Date().toISOString(),
        timezone: 'Asia/Ho_Chi_Minh',
        kind: 'birthday',
        remindOffsetMinutes: 0,
      })
      .expect(201);

    const deliveries = await prisma.pushDelivery.findMany();
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].title).toBe('Sinh nhật');
    expect(deliveries[0].body).toBe('');
    const device = await prisma.device.findUniqueOrThrow({ where: { id: deliveries[0].deviceId } });
    expect(device.userId).toBe(bao.user.id);
    expect(device.userId).not.toBe(ada.user.id);
  });
});