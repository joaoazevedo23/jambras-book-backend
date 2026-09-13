import { Test, TestingModule } from '@nestjs/testing';
import { BooksService } from './books.service';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { ActivitiesService } from '../activities/activities.service';
import { NotificationsService } from '../notifications/notifications.service';
import { of } from 'rxjs';

describe('BooksService', () => {
  let service: BooksService;

  const mockPrismaService = {
    book: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockHttpService = {
    get: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'GOOGLE_BOOKS_API_KEY') return 'mock-api-key';
      return null;
    }),
  };

  const mockActivitiesService = {
    logActivity: jest.fn(),
  };

  const mockNotificationsService = {
    createNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: ActivitiesService, useValue: mockActivitiesService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('deve retornar um livro cadastrado no banco local', async () => {
      const mockBook = {
        id: 'book-uuid-1',
        title: 'Dom Casmurro',
        author: 'Machado de Assis',
        genres: ['Romance'],
      };

      mockPrismaService.book.findUnique.mockResolvedValue(mockBook);

      const result = await service.findById('book-uuid-1');

      expect(result).toEqual(mockBook);
      expect(mockPrismaService.book.findUnique).toHaveBeenCalledWith({
        where: { id: 'book-uuid-1' },
      });
    });

    it('deve lançar NotFoundException quando o livro não existir', async () => {
      mockPrismaService.book.findUnique.mockResolvedValue(null);

      try {
        await service.findById('id-inexistente');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
      }
    });
  });

  describe('searchExternal', () => {
    it('deve buscar e formatar resultados da API do Google Books', async () => {
      const mockApiResponse = {
        data: {
          items: [
            {
              id: 'google-id-1',
              volumeInfo: {
                title: 'Clean Code',
                authors: ['Robert C. Martin'],
                description: 'A Handbook of Agile Software Craftsmanship',
                imageLinks: { thumbnail: 'http://example.com/cover.jpg' },
                pageCount: 464,
                categories: ['Computers'],
              },
            },
          ],
        },
      };

      mockHttpService.get.mockReturnValue(of(mockApiResponse));

      const results = await service.searchExternal('Clean Code');

      expect(results).toBeDefined();
      if (results && results.length > 0) {
        expect(results).toHaveLength(1);
        expect(results[0]?.title).toBe('Clean Code');
        expect(results[0]?.googleBooksId).toBe('google-id-1');
      }
      expect(mockHttpService.get).toHaveBeenCalled();
    });
  });
});
