import { Test, TestingModule } from '@nestjs/testing';
import { CompetitionsService } from './competitions.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CompetitionStatus } from '@prisma/client';

describe('CompetitionsService', () => {
  let service: CompetitionsService;

  const mockPrismaService = {
    book: {
      findUnique: jest.fn(),
    },
    competition: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    competitionParticipant: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    userBook: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockNotificationsService = {
    createNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompetitionsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<CompetitionsService>(CompetitionsService);
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('deve lançar NotFoundException se o livro associado não existir', async () => {
      mockPrismaService.book.findUnique.mockResolvedValue(null);

      await expect(
        service.create('user-1', {
          name: 'Desafio de Leitura',
          bookId: 'book-invalido',
          startDate: new Date(),
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('joinCompetition', () => {
    it('deve lançar ConflictException se o usuário já estiver participando', async () => {
      mockPrismaService.competition.findUnique.mockResolvedValue({
        id: 'comp-1',
        bookId: 'book-1',
        status: CompetitionStatus.ACTIVE,
      });

      mockPrismaService.competitionParticipant.findUnique.mockResolvedValue({
        id: 'part-1',
      });

      await expect(service.joinCompetition('user-1', 'comp-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
