/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Auth Sessions & Logout (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const userA = {
    email: 'e2e-session-a@teste.com',
    username: 'e2esessiona',
    name: 'Sessao A',
    password: 'password123',
  };
  const userB = {
    email: 'e2e-session-b@teste.com',
    username: 'e2esessionb',
    name: 'Sessao B',
    password: 'password123',
  };

  let atA1: string;
  let rtA1: string;
  let rtA2: string;
  let atB: string;
  let userAId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    await prisma.user.deleteMany({
      where: { email: { in: [userA.email, userB.email] } },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [userA.email, userB.email] } },
    });
    await app.close();
  });

  const register = async (dto: typeof userA) => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(dto)
      .expect(201);
    return res.body as {
      user: { id: string };
      tokens: { accessToken: string; refreshToken: string };
    };
  };

  describe('Sessões independentes do mesmo usuário', () => {
    it('registro e login criam duas sessões independentes', async () => {
      const reg = await register(userA);
      atA1 = reg.tokens.accessToken;
      rtA1 = reg.tokens.refreshToken;
      userAId = reg.user.id;

      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ login: userA.email, password: userA.password })
        .expect(200);
      const loginBody = login.body as {
        tokens: { refreshToken: string };
      };
      rtA2 = loginBody.tokens.refreshToken;

      const sessions = await prisma.refreshToken.findMany({
        where: { userId: userAId, revoked: false },
      });
      expect(sessions.length).toBe(2);
      expect(rtA1).not.toEqual(rtA2);
    });

    it('logout da sessão A revoga apenas a sessão A', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${atA1}`)
        .send({ refreshToken: rtA1 })
        .expect(200)
        .expect({ success: true });

      const sessionA = await prisma.refreshToken.findUnique({
        where: { token: rtA1 },
      });
      const sessionB = await prisma.refreshToken.findUnique({
        where: { token: rtA2 },
      });
      expect(sessionA?.revoked).toBe(true);
      expect(sessionB?.revoked).toBe(false);
    });

    it('sessão B continua podendo fazer refresh', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${rtA2}`)
        .expect(200);

      const body = res.body as {
        accessToken: string;
        refreshToken: string;
      };
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      rtA2 = body.refreshToken; // rotação: novo RT da sessão B
    });

    it('sessão A não consegue mais fazer refresh após logout', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${rtA1}`)
        .expect(403);
    });

    it('logout repetido é idempotente', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${atA1}`)
        .send({ refreshToken: rtA1 })
        .expect(200)
        .expect({ success: true });
    });
  });

  describe('Validação do contrato de logout', () => {
    it('rejeita body sem refreshToken com 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${atA1}`)
        .send({})
        .expect(400);
    });

    it('rejeita refreshToken vazio com 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${atA1}`)
        .send({ refreshToken: '' })
        .expect(400);
    });

    it('rejeita refreshToken não-string com 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${atA1}`)
        .send({ refreshToken: 123 })
        .expect(400);
    });

    it('rejeita logout sem access token com 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken: rtA2 })
        .expect(401);
    });
  });

  describe('Isolamento entre usuários', () => {
    it('usuário autenticado não revoga a sessão de outro usuário', async () => {
      const reg = await register(userB);
      atB = reg.tokens.accessToken;

      // user B tenta derrubar a sessão A2 do user A
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${atB}`)
        .send({ refreshToken: rtA2 })
        .expect(200)
        .expect({ success: true });

      // A sessão do user A continua válida
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${rtA2}`)
        .expect(200);
    });
  });
});
