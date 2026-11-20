/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Bookr Core Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let accessToken: string;
  let userId: string;
  let otherUserId: string;
  let createdBookId: string;
  let userBookId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    await prisma.user.deleteMany({
      where: {
        email: { in: ['e2e-flow@teste.com', 'e2e-public@teste.com'] },
      },
    });
    await prisma.book.deleteMany({
      where: { isbn: '9780132350884' },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: { in: ['e2e-flow@teste.com', 'e2e-public@teste.com'] },
      },
    });
    await prisma.book.deleteMany({
      where: { isbn: '9780132350884' },
    });
    await app.close();
  });

  describe('Auth & Profile', () => {
    it('POST /auth/register - deve registrar usuário', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'e2e-flow@teste.com',
          username: 'e2eflow',
          name: 'Usuario E2E Flow',
          password: 'password123',
        })
        .expect(201);

      const body = response.body as {
        tokens: { accessToken: string };
        user: { id: string };
      };

      accessToken = body.tokens.accessToken;
      userId = body.user.id;

      expect(accessToken).toBeDefined();
      expect(userId).toBeDefined();
    });

    it('GET /users/me - deve retornar dados do perfil logado', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const body = response.body as { email: string; username: string };
      expect(body.email).toBe('e2e-flow@teste.com');
      expect(body.username).toBe('e2eflow');
    });

    it('POST /auth/register - deve registrar segundo usuário para testes de perfil público', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'e2e-public@teste.com',
          username: 'e2epublic',
          name: 'Usuario E2E Public',
          password: 'password123',
        })
        .expect(201);

      const body = response.body as { user: { id: string } };
      otherUserId = body.user.id;
      expect(otherUserId).toBeDefined();
    });

    it('GET /users/:id - não deve expor email nem campos privados de outro usuário', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${otherUserId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const body = response.body as Record<string, unknown>;

      expect(body.id).toBe(otherUserId);
      expect(body.username).toBe('e2epublic');
      expect(body.name).toBe('Usuario E2E Public');
      expect(Object.keys(body).sort()).toEqual(
        [
          'id',
          'username',
          'name',
          'avatarUrl',
          'bio',
          'createdAt',
          'updatedAt',
        ].sort(),
      );
      expect(body).not.toHaveProperty('email');
      expect(body).not.toHaveProperty('passwordHash');
      expect(body).not.toHaveProperty('refreshTokens');
    });

    it('GET /users/:id - deve retornar 404 para usuário inexistente', async () => {
      await request(app.getHttpServer())
        .get('/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('Books & Shelf', () => {
    it('POST /books - deve cadastrar livro no catálogo', async () => {
      const response = await request(app.getHttpServer())
        .post('/books')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Clean Code',
          author: 'Robert C. Martin',
          isbn: '9780132350884',
          pageCount: 464,
          genres: ['Tecnologia'],
        })
        .expect(201);

      const body = response.body as { id: string };
      createdBookId = body.id;
      expect(createdBookId).toBeDefined();
    });

    it('PATCH /books/:id/shelf - deve adicionar livro na estante', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/books/${createdBookId}/shelf`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: 'READING',
          currentPage: 0,
        })
        .expect(200);

      const body = response.body as { id: string; status: string };
      userBookId = body.id;
      expect(body.status).toBe('READING');
    });

    it('POST /books/user-books/:userBookId/sessions - deve registrar sessão de leitura', async () => {
      const response = await request(app.getHttpServer())
        .post(`/books/user-books/${userBookId}/sessions`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          startPage: 0,
          endPage: 50,
          notes: 'Excelente leitura sobre Clean Code.',
        })
        .expect(201);

      const body = response.body as { pagesRead: number };
      expect(body.pagesRead).toBe(50);
    });
  });

  describe('Book Cover Upload (temporariamente desabilitado)', () => {
    const coversDir = path.join(process.cwd(), 'uploads', 'covers');
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    let coverBookId: string;
    let sentinelPath: string;

    beforeAll(async () => {
      fs.mkdirSync(coversDir, { recursive: true });
      sentinelPath = path.join(coversDir, 'cover-e2e-sentinel.png');
      fs.writeFileSync(sentinelPath, pngBuffer);

      const book = await prisma.book.create({
        data: {
          title: 'Livro Com Capa E2E',
          author: 'Autor E2E',
          coverUrl: '/uploads/covers/cover-e2e-sentinel.png',
        },
      });
      coverBookId = book.id;
    });

    afterAll(async () => {
      await prisma.book.deleteMany({ where: { id: coverBookId } });
      if (fs.existsSync(sentinelPath)) fs.unlinkSync(sentinelPath);
    });

    it('PATCH /books/:id/cover - deve retornar 401 sem autenticação', async () => {
      await request(app.getHttpServer())
        .patch(`/books/${coverBookId}/cover`)
        .attach('file', pngBuffer, 'nova-capa.png')
        .expect(401);
    });

    it('PATCH /books/:id/cover - deve retornar 403 para usuário autenticado', async () => {
      await request(app.getHttpServer())
        .patch(`/books/${coverBookId}/cover`)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', pngBuffer, 'nova-capa.png')
        .expect(403);
    });

    it('PATCH /books/:id/cover - não deve alterar coverUrl, gravar arquivo nem apagar capa existente', async () => {
      const filesBefore = fs.readdirSync(coversDir).sort();

      await request(app.getHttpServer())
        .patch(`/books/${coverBookId}/cover`)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', pngBuffer, 'nova-capa.png')
        .expect(403);

      expect(fs.readdirSync(coversDir).sort()).toEqual(filesBefore);
      expect(fs.existsSync(sentinelPath)).toBe(true);

      const book = await prisma.book.findUnique({
        where: { id: coverBookId },
      });
      expect(book?.coverUrl).toBe('/uploads/covers/cover-e2e-sentinel.png');
    });

    it('PATCH /users/me/avatar - upload de avatar permanece funcionando', async () => {
      const response = await request(app.getHttpServer())
        .patch('/users/me/avatar')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', pngBuffer, 'avatar.png')
        .expect(200);

      const body = response.body as { avatarUrl?: string };
      if (body.avatarUrl?.startsWith('/uploads/')) {
        const uploaded = path.join(process.cwd(), body.avatarUrl);
        if (fs.existsSync(uploaded)) fs.unlinkSync(uploaded);
      }
    });
  });

  describe('Stats & Feed', () => {
    it('GET /users/me/stats - deve calcular estatísticas acumuladas', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const body = response.body as {
        totalPagesRead: number;
        favoriteGenres: string[];
      };

      expect(body.totalPagesRead).toBe(50);
      expect(body.favoriteGenres).toContain('Tecnologia');
    });

    it('GET /activities/feed - deve carregar a sessão de leitura no feed', async () => {
      const response = await request(app.getHttpServer())
        .get('/activities/feed')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const body = response.body as { data: Array<{ type: string }> };
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data[0].type).toBe('READING_SESSION');
    });
  });
});
