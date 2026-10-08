import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import Redis from 'ioredis';
import { io, Socket } from 'socket.io-client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/main';
import { normalizeDestination } from '../src/identity/destination';
import { PrismaService } from '../src/prisma/prisma.module';

describe('phase 2 chat and secrets', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: Redis;
  let port = 0;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    await app.listen(0);
    const address = app.getHttpServer().address();
    port = typeof address === 'object' && address ? address.port : 0;
    prisma = app.get(PrismaService);
    redis = new Redis(process.env.REDIS_URL as string);
  });

  afterAll(async () => {
    sockets.forEach((socket) => socket.disconnect());
    await redis.quit();
    await app.close();
  });

  beforeEach(async () => {
    sockets.splice(0).forEach((socket) => socket.disconnect());
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "push_deliveries", "message_receipts", "messages", "secret_messages", "events", "notes", "sessions", "devices", "pair_invites", "partnership_members", "partnerships", "users" RESTART IDENTITY CASCADE',
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
    return response.body as { accessToken: string; user: { id: string } };
  }

  function authed(token: string) {
    const server = app.getHttpServer();
    const header = { Authorization: `Bearer ${token}` };
    return {
      get: (url: string) => request(server).get(url).set(header),
      post: (url: string) => request(server).post(url).set(header),
    };
  }

  function connect(token: string) {
    const socket = io(`http://127.0.0.1:${port}`, {
      auth: { token },
      reconnection: false,
      timeout: 5000,
    });
    sockets.push(socket);
    return socket;
  }

  function connected(socket: Socket) {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`socket timeout; connected=${socket.connected}`)), 5000);
      socket.on('connect_error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      socket.on('connect', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  async function pair() {
    const ada = await login('ada@example.com', 'token-ada');
    const bao = await login('bao@example.com', 'token-bao');
    const invite = await authed(ada.accessToken).post('/v1/invites').expect(201);
    const partnership = await authed(bao.accessToken)
      .post(`/v1/invites/${invite.body.code}/accept`)
      .expect(201);
    return { ada, bao, partnershipId: partnership.body.id as string };
  }

  it('rejects a duplicate message and hides the thread from outsiders', async () => {
    const { ada, bao, partnershipId } = await pair();
    const cam = await login('cam@example.com');
    const payload = { clientMsgId: 'local-1', kind: 'text', body: 'chào bao' };
    const created = await authed(ada.accessToken).post(`/v1/partnerships/${partnershipId}/messages`).send(payload).expect(201);
    await authed(ada.accessToken).post(`/v1/partnerships/${partnershipId}/messages`).send(payload).expect(409);
    expect(await prisma.message.count()).toBe(1);

    const seen = await authed(bao.accessToken).get(`/v1/partnerships/${partnershipId}/messages`).expect(200);
    expect(seen.body[0].body).toBe('chào bao');
    await authed(cam.accessToken).get(`/v1/partnerships/${partnershipId}/messages`).expect(403);

    const deliveries = await prisma.pushDelivery.findMany({ where: { messageId: created.body.id } });
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].title).toBe('Có tin mới');
    expect(deliveries[0].body).toBe('');
    const device = await prisma.device.findUniqueOrThrow({ where: { id: deliveries[0].deviceId } });
    expect(device.userId).toBe(bao.user.id);
  });

  it('delivers chat and typing over the partnership socket', async () => {
    const { ada, bao, partnershipId } = await pair();
    const baoSocket = connect(bao.accessToken);
    const adaSocket = connect(ada.accessToken);
    await Promise.all([connected(baoSocket), connected(adaSocket)]);
    const incoming = new Promise<Record<string, unknown>>((resolve) => baoSocket.on('message.created', resolve));
    const typing = new Promise<Record<string, unknown>>((resolve) => baoSocket.on('typing', resolve));
    adaSocket.emit('typing', { active: true });
    await authed(ada.accessToken)
      .post(`/v1/partnerships/${partnershipId}/messages`)
      .send({ clientMsgId: 'local-2', kind: 'sticker', stickerId: 'heart' })
      .expect(201);
    await expect(incoming).resolves.toMatchObject({ stickerId: 'heart', kind: 'sticker' });
    await expect(typing).resolves.toMatchObject({ userId: ada.user.id, active: true });
    expect(await prisma.message.count({ where: { kind: 'sticker' } })).toBe(1);
  });

  it('shows a secret as opened for the partner after reveal', async () => {
    const { ada, bao } = await pair();
    const secret = await authed(ada.accessToken)
      .post('/v1/secret-messages')
      .send({ kind: 'text', body: 'mở ra đi' })
      .expect(201);
    const hidden = await authed(bao.accessToken).get('/v1/secret-messages').expect(200);
    expect(hidden.body[0].body).toBeNull();
    expect(hidden.body[0].revealedAt).toBeNull();
    const opened = await authed(bao.accessToken).post(`/v1/secret-messages/${secret.body.id}/reveal`).expect(201);
    expect(opened.body.body).toBe('mở ra đi');
    const senderView = await authed(ada.accessToken).get('/v1/secret-messages').expect(200);
    expect(senderView.body[0].revealedAt).toEqual(expect.any(String));

    const image = await authed(ada.accessToken)
      .post('/v1/secret-messages')
      .send({ kind: 'image', imageRef: 'local-photo-1' })
      .expect(201);
    const revealedImage = await authed(bao.accessToken).post(`/v1/secret-messages/${image.body.id}/reveal`).expect(201);
    expect(revealedImage.body.imageRef).toBe('local-photo-1');
  });
});