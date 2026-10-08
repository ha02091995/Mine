import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import Redis from 'ioredis';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/main';
import { PrismaService } from '../src/prisma/prisma.module';
import { normalizeDestination } from '../src/identity/destination';

describe('phase 0 pairing', () => {
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
      'TRUNCATE TABLE "sessions", "devices", "pair_invites", "partnership_members", "partnerships", "users" RESTART IDENTITY CASCADE',
    );
    await redis.flushdb();
  });

  async function login(destination: string, platform = 'test') {
    const normalized = normalizeDestination(destination);
    await request(app.getHttpServer()).post('/v1/auth/otp').send({ destination }).expect(201);
    const code = await redis.get(`otp:${normalized}`);
    const response = await request(app.getHttpServer())
      .post('/v1/auth/sessions')
      .send({ destination, code, device: { platform } })
      .expect(201);
    return response.body as {
      accessToken: string;
      refreshToken: string;
      user: { id: string; destination: string; displayName: string };
    };
  }

  function authed(token: string) {
    const server = app.getHttpServer();
    const header = { Authorization: `Bearer ${token}` };
    return {
      get: (url: string) => request(server).get(url).set(header),
      post: (url: string) => request(server).post(url).set(header),
      patch: (url: string) => request(server).patch(url).set(header),
      delete: (url: string) => request(server).delete(url).set(header),
    };
  }

  it('pairs two people and refuses a third', async () => {
    const ada = await login('ada@example.com');
    const bao = await login('bao@example.com');
    const invite = await authed(ada.accessToken).post('/v1/invites').expect(201);
    const partnership = await authed(bao.accessToken)
      .post(`/v1/invites/${invite.body.code}/accept`)
      .expect(201);

    expect(partnership.body.daysTogether).toBe(1);
    expect(partnership.body.members.map((member: { userId: string }) => member.userId).sort()).toEqual(
      [ada.user.id, bao.user.id].sort(),
    );

    const cam = await login('cam@example.com');
    await authed(cam.accessToken).get('/v1/partnership').expect(404);
    await authed(cam.accessToken).post(`/v1/partnerships/${partnership.body.id}/leave`).expect(403);

    const seen = await authed(ada.accessToken).get('/v1/partnership').expect(200);
    expect(seen.body.id).toBe(partnership.body.id);
  });

  it('rejects a second invite for someone who is already paired', async () => {
    const ada = await login('ada@example.com');
    const bao = await login('bao@example.com');
    const cam = await login('cam@example.com');
    const invite = await authed(ada.accessToken).post('/v1/invites').expect(201);
    await authed(bao.accessToken).post(`/v1/invites/${invite.body.code}/accept`).expect(201);

    await authed(ada.accessToken).post('/v1/invites').expect(409);
    const other = await authed(cam.accessToken).post('/v1/invites').expect(201);
    await authed(ada.accessToken).post(`/v1/invites/${other.body.code}/accept`).expect(409);
  });

  it('keeps one active membership per user in the database', async () => {
    const ada = await login('ada@example.com');
    const bao = await login('bao@example.com');
    const invite = await authed(ada.accessToken).post('/v1/invites').expect(201);
    const partnership = await authed(bao.accessToken)
      .post(`/v1/invites/${invite.body.code}/accept`)
      .expect(201);
    const extra = await prisma.partnership.create({
      data: { startedOn: new Date(), status: 'active' },
    });
    await expect(
      prisma.partnershipMember.create({
        data: { partnershipId: extra.id, userId: ada.user.id, status: 'active' },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
    expect(partnership.body.status).toBe('active');
  });

  it('rotates refresh tokens and revokes access on logout', async () => {
    const ada = await login('ada@example.com');
    const refreshed = await request(app.getHttpServer())
      .post('/v1/auth/sessions/refresh')
      .send({ refreshToken: ada.refreshToken })
      .expect(201);
    await request(app.getHttpServer())
      .post('/v1/auth/sessions/refresh')
      .send({ refreshToken: ada.refreshToken })
      .expect(401);
    await authed(refreshed.body.accessToken).delete('/v1/auth/sessions').expect(200);
    await authed(refreshed.body.accessToken).get('/v1/partnership').expect(401);
  });
});
