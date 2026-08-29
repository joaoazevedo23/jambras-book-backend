import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompetitionStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompetitionDto } from './dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CompetitionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(creatorId: string, dto: CreateCompetitionDto) {
    const book = await this.prisma.book.findUnique({
      where: { id: dto.bookId },
    });

    if (!book) {
      throw new NotFoundException('Livro não encontrado');
    }

    return this.prisma.competition.create({
      data: {
        name: dto.name,
        bookId: dto.bookId,
        creatorId,
        startDate: dto.startDate,
        endDate: dto.endDate,
        status: CompetitionStatus.SCHEDULED,
        participants: {
          create: {
            userId: creatorId,
          },
        },
      },
      include: {
        book: true,
        creator: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
        participants: true,
      },
    });
  }

  async joinCompetition(userId: string, competitionId: string) {
    const competition = await this.prisma.competition.findUnique({
      where: { id: competitionId },
    });

    if (!competition) {
      throw new NotFoundException('Competição não encontrada');
    }

    if (
      competition.status === CompetitionStatus.FINISHED ||
      competition.status === CompetitionStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Esta competição já foi encerrada ou cancelada',
      );
    }

    const existingParticipant =
      await this.prisma.competitionParticipant.findUnique({
        where: {
          competitionId_userId: { competitionId, userId },
        },
      });

    if (existingParticipant) {
      throw new ConflictException('Você já está participando desta competição');
    }

    const userBook = await this.prisma.userBook.findUnique({
      where: {
        userId_bookId: { userId, bookId: competition.bookId },
      },
    });

    const startingPage = userBook?.currentPage ?? 0;

    const participant = await this.prisma.competitionParticipant.create({
      data: {
        competitionId,
        userId,
        startingPage,
      },
      include: {
        user: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
      },
    });

    if (competition.creatorId !== userId) {
      await this.notificationsService.createNotification({
        userId: competition.creatorId,
        type: NotificationType.COMPETITION_JOIN,
        title: 'Novo participante! 🏆',
        message: `${participant.user.name} entrou na competição "${competition.name}".`,
        linkUrl: `/competitions/${competitionId}`,
      });
    }

    return participant;
  }

  async getLeaderboard(competitionId: string) {
    const competition = await this.prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        book: true,
        participants: {
          include: {
            user: {
              select: { id: true, name: true, username: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!competition) {
      throw new NotFoundException('Competição não encontrada');
    }

    const participantUserIds = competition.participants.map((p) => p.userId);
    const userBooks = await this.prisma.userBook.findMany({
      where: {
        bookId: competition.bookId,
        userId: { in: participantUserIds },
      },
    });

    const leaderboard = competition.participants.map((participant) => {
      const ub = userBooks.find((u) => u.userId === participant.userId);
      const currentPage = ub?.currentPage ?? 0;
      const pagesReadInCompetition = Math.max(
        0,
        currentPage - participant.startingPage,
      );

      return {
        user: participant.user,
        currentPage,
        pagesReadInCompetition,
        joinedAt: participant.joinedAt,
        finishedAt: participant.finishedAt,
      };
    });

    leaderboard.sort(
      (a, b) => b.pagesReadInCompetition - a.pagesReadInCompetition,
    );

    return {
      competition: {
        id: competition.id,
        name: competition.name,
        status: competition.status,
        book: competition.book,
      },
      leaderboard,
    };
  }

  async findAll(userId: string) {
    return this.prisma.competition.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      include: {
        book: true,
        creator: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
        _count: {
          select: { participants: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
