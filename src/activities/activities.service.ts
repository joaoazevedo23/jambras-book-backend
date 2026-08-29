import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityType,
  FriendshipStatus,
  NotificationType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async logActivity(data: {
    userId: string;
    type: ActivityType;
    readingSessionId?: string;
    competitionId?: string;
    metadata?: Record<string, any>;
  }) {
    return this.prisma.activity.create({
      data: {
        userId: data.userId,
        type: data.type,
        readingSessionId: data.readingSessionId,
        competitionId: data.competitionId,
        metadata: data.metadata ?? {},
      },
    });
  }

  async getFeed(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      select: { requesterId: true, addresseeId: true },
    });

    const friendIds = friendships.map((f) =>
      f.requesterId === userId ? f.addresseeId : f.requesterId,
    );

    const targetUserIds = [userId, ...friendIds];

    const [activities, total] = await Promise.all([
      this.prisma.activity.findMany({
        where: { userId: { in: targetUserIds } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, username: true, avatarUrl: true },
          },
          readingSession: {
            include: {
              userBook: {
                include: { book: true },
              },
            },
          },
          likes: {
            select: { userId: true },
          },
          comments: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  avatarUrl: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
          _count: {
            select: { likes: true, comments: true },
          },
        },
      }),
      this.prisma.activity.count({
        where: { userId: { in: targetUserIds } },
      }),
    ]);

    const formattedData = activities.map((act) => {
      const isLikedByMe = act.likes.some((like) => like.userId === userId);
      const { likes, ...rest } = act;
      return {
        ...rest,
        isLikedByMe,
      };
    });

    return {
      data: formattedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async likeActivity(userId: string, activityId: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      throw new NotFoundException('Atividade não encontrada');
    }

    const existing = await this.prisma.like.findUnique({
      where: {
        activityId_userId: { activityId, userId },
      },
    });

    if (existing) {
      throw new ConflictException('Você já curtiu esta atividade');
    }

    const like = await this.prisma.like.create({
      data: { activityId, userId },
    });

    if (activity.userId !== userId) {
      const liker = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      await this.notificationsService.createNotification({
        userId: activity.userId,
        type: NotificationType.ACTIVITY_LIKE,
        title: 'Nova curtida',
        message: `${liker?.name ?? 'Alguém'} curtiu a sua publicação.`,
        linkUrl: `/feed`,
      });
    }

    return like;
  }

  async unlikeActivity(userId: string, activityId: string) {
    const existing = await this.prisma.like.findUnique({
      where: {
        activityId_userId: { activityId, userId },
      },
    });

    if (!existing) {
      throw new NotFoundException('Curtida não encontrada');
    }

    await this.prisma.like.delete({
      where: { id: existing.id },
    });

    return { message: 'Curtida removida' };
  }

  async addComment(userId: string, activityId: string, dto: CreateCommentDto) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      throw new NotFoundException('Atividade não encontrada');
    }

    const comment = await this.prisma.comment.create({
      data: {
        userId,
        activityId,
        content: dto.content,
      },
      include: {
        user: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
      },
    });

    if (activity.userId !== userId) {
      await this.notificationsService.createNotification({
        userId: activity.userId,
        type: NotificationType.ACTIVITY_COMMENT,
        title: 'Novo comentário',
        message: `${comment.user.name} comentou na sua publicação.`,
        linkUrl: `/feed`,
      });
    }

    return comment;
  }

  async removeComment(userId: string, commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comentário não encontrado');
    }

    if (comment.userId !== userId) {
      throw new BadRequestException(
        'Você só pode excluir seus próprios comentários',
      );
    }

    await this.prisma.comment.delete({
      where: { id: commentId },
    });

    return { message: 'Comentário removido' };
  }
}
