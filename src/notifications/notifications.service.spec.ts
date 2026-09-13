import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockPrismaService = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('deve criar uma nova notificação', async () => {
      const payload = {
        userId: 'user-1',
        type: NotificationType.FRIEND_REQUEST,
        title: 'Novo pedido',
        message: 'Você recebeu um pedido de amizade',
      };

      mockPrismaService.notification.create.mockResolvedValue({
        id: 'notif-1',
        ...payload,
        createdAt: new Date(),
      });

      const result = await service.createNotification(payload);

      expect(result.id).toBe('notif-1');
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: payload,
      });
    });
  });

  describe('markAsRead', () => {
    it('deve lançar NotFoundException se a notificação não pertencer ao usuário', async () => {
      mockPrismaService.notification.findFirst.mockResolvedValue(null);

      await expect(
        service.markAsRead('user-1', 'notif-invalida'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
