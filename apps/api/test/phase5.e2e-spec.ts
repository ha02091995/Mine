import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import Redis from 'ioredis';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/main';
import { normalizeDestination } from '../src/identity/destination';
import { PrismaService } from '../src/prisma/prisma.module';

describe('phase 5 battery weather and location', () => {
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
    process.env.LOCATION_SHARING = 'true';
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "status_current", "saved_items", "shared_list_items", "shared_lists", "story_entries", "album_items", "albums", "media_objects", "push_deliveries", "message_receipts", "messages", "secret_messages", "events", "notes", "sessions", "devices", "pair_invites", "partnership_members", "partnerships", "users" RESTART IDENTITY CASCADE',
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
      patch: (url: string) => request(server).patch(url).set(header),
    };
  }

  async function pair() {
    const ada = await login('ada@example.com');
    const bao = await login('bao@example.com');
    const invite = await authed(ada.accessToken).post('/v1/invites').expect(201);
    await authed(bao.accessToken).post(`/v1/invites/${invite.body.code}/accept`).expect(201);
    return { ada, bao };
  }

  it('clears the last point when location sharing is turned off', async () => {
    const { ada, bao } = await pair();
    const logs: string[] = [];
    const spy = jest.spyOn(console, 'log').mockImplementation((...args) => {
      logs.push(args.map(String).join(' '));
    });
    await authed(ada.accessToken)
      .put('/v1/me/status')
      .send({ batteryEnabled: true, batteryPercent: 81, locationEnabled: true, lat: 21.0285, lng: 105.8542 })
      .expect(200);
    await authed(ada.accessToken)
      .put('/v1/me/status')
      .send({ batteryEnabled: false, locationEnabled: false })
      .expect(200);
    spy.mockRestore();

    const seen = await authed(bao.accessToken).get(`/v1/partners/${ada.user.id}/status`).expect(200);
    expect(seen.body.location).toEqual({ enabled: false });
    expect(seen.body.battery).toEqual({ enabled: false });
    expect(JSON.stringify(seen.body)).not.toContain('21.0285');

    const row = await prisma.statusCurrent.findUniqueOrThrow({ where: { userId: ada.user.id } });
    expect(row.lat).toBeNull();
    expect(row.lng).toBeNull();
    expect(row.locationAt).toBeNull();
    expect(row.batteryPercent).toBeNull();
    expect(await prisma.statusCurrent.count({ where: { userId: ada.user.id } })).toBe(1);
    expect(logs.join('\n')).not.toContain('21.0285');

    const tables = await prisma.$queryRaw<{ name: string }[]>`
      SELECT table_name::text AS name FROM information_schema.tables WHERE table_schema = 'public'
    `;
    expect(tables.map((table) => table.name)).toContain('status_current');
    expect(tables.map((table) => table.name).filter((name) => /location|whereabouts/i.test(name))).toEqual([]);
  });

  it('uses a point only while sharing and refuses coordinates when the flag is off', async () => {
    const { ada, bao } = await pair();
    await authed(ada.accessToken).patch('/v1/me').send({ city: 'Hà Nội' }).expect(200);
    const byCity = await authed(ada.accessToken).get('/v1/me/weather').expect(200);
    expect(byCity.body.source).toBe('city');
    expect(byCity.body).not.toHaveProperty('lat');

    await authed(ada.accessToken)
      .put('/v1/me/status')
      .send({ batteryEnabled: false, locationEnabled: true, lat: 10.5, lng: 106.7 })
      .expect(200);
    const byPoint = await authed(ada.accessToken).get('/v1/me/weather').expect(200);
    expect(byPoint.body.source).toBe('point');
    expect(JSON.stringify(byPoint.body)).not.toContain('10.5');

    const hidden = await authed(bao.accessToken).get(`/v1/partners/${ada.user.id}/status`).expect(200);
    expect(hidden.body.location.enabled).toBe(true);

    process.env.LOCATION_SHARING = 'false';
    await authed(ada.accessToken)
      .put('/v1/me/status')
      .send({ batteryEnabled: false, locationEnabled: true, lat: 1, lng: 2 })
      .expect(403);
    const row = await prisma.statusCurrent.findUniqueOrThrow({ where: { userId: ada.user.id } });
    expect(row.lat).toBeCloseTo(10.5);
    expect(row.lng).toBeCloseTo(106.7);
  });
});
