/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserBookStatus } from '@prisma/client';
import {
  NotFoundException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    readingSession: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    userBook: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('deve retornar o perfil do usuário encontrado', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@teste.com',
        username: 'user1',
        name: 'User One',
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById('user-1');

      expect(result).toEqual(mockUser);
    });

    it('deve lançar NotFoundException se o usuário não for encontrado', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('user-invalido')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('deve lançar ConflictException se o username já estiver em uso por outro usuário', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'outro-user-id',
        username: 'duplicado',
      });

      await expect(
        service.updateProfile('user-1', { username: 'duplicado' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('changePassword', () => {
    it('deve lançar UnauthorizedException se a senha antiga estiver incorreta', async () => {
      const hash = await bcrypt.hash('senhaCorreta', 10);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash: hash,
      });

      await expect(
        service.changePassword('user-1', {
          oldPassword: 'senhaErrada',
          newPassword: 'novaSenha123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getUserStats', () => {
    it('deve calcular as estatísticas do usuário corretamente', async () => {
      const mockUserId = 'user-uuid-123';

      mockPrismaService.readingSession.aggregate.mockResolvedValue({
        _sum: { pagesRead: 350 },
      });

      mockPrismaService.userBook.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2);

      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      mockPrismaService.readingSession.findMany.mockResolvedValue([
        { date: today },
        { date: yesterday },
      ]);

      mockPrismaService.userBook.findMany.mockResolvedValue([
        { book: { genres: ['Fantasia', 'Ficção'] } },
        { book: { genres: ['Fantasia', 'Aventura'] } },
      ]);

      const stats = await service.getUserStats(mockUserId);

      expect(stats).toEqual({
        totalPagesRead: 350,
        completedBooksCount: 5,
        completedThisMonth: 2,
        currentStreak: 2,
        favoriteGenres: ['Fantasia', 'Ficção', 'Aventura'],
      });

      expect(prisma.readingSession.aggregate).toHaveBeenCalledWith({
        where: { userBook: { userId: mockUserId } },
        _sum: { pagesRead: true },
      });
      expect(prisma.userBook.count).toHaveBeenCalledWith({
        where: { userId: mockUserId, status: UserBookStatus.COMPLETED },
      });
    });
  });
});
