import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityType, FriendshipStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.like.create({
      data: { activityId, userId },
    });
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

    return this.prisma.comment.create({
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
