import { Test, TestingModule } from '@nestjs/testing';
import { ActivitiesService } from './activities.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityType } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('ActivitiesService', () => {
  let service: ActivitiesService;

  const mockPrismaService = {
    activity: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    like: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    comment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockNotificationsService = {
    createNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<ActivitiesService>(ActivitiesService);
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('logActivity', () => {
    it('deve registrar uma nova atividade no feed', async () => {
      const mockData = {
        userId: 'user-uuid-123',
        type: ActivityType.READING_SESSION,
        readingSessionId: 'session-uuid-123',
      };

      mockPrismaService.activity.create.mockResolvedValue({
        id: 'activity-uuid-1',
        ...mockData,
        createdAt: new Date(),
      });

      const result = await service.logActivity(mockData);

      expect(result.id).toBe('activity-uuid-1');
      expect(mockPrismaService.activity.create).toHaveBeenCalledWith({
        data: {
          userId: mockData.userId,
          type: mockData.type,
          readingSessionId: mockData.readingSessionId,
          competitionId: undefined,
          metadata: {},
        },
      });
    });
  });

  describe('likeActivity', () => {
    it('deve lançar NotFoundException se a atividade não existir', async () => {
      mockPrismaService.activity.findUnique.mockResolvedValue(null);

      await expect(
        service.likeActivity('user-1', 'activity-invalida'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
