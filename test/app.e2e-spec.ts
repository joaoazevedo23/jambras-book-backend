/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Bookr Core Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let accessToken: string;
  let userId: string;
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
      where: { email: 'e2e-flow@teste.com' },
    });
    await prisma.book.deleteMany({
      where: { isbn: '9780132350884' },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: 'e2e-flow@teste.com' },
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
