import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserBookStatus } from '@prisma/client';
import { UpdateUserDto, ChangePasswordDto } from './dto';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    if (dto.username) {
      const existingUser = await this.prisma.user.findUnique({
        where: { username: dto.username },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Nome de usuário já está em uso');
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { ...dto },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        bio: true,
        updatedAt: true,
      },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('Usuário não encontrado');

    const passwordMatches = await bcrypt.compare(
      dto.oldPassword,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Senha antiga incorreta');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    return { message: 'Senha alterada com sucesso' };
  }

  async updateAvatar(userId: string, file: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('Usuário não encontrado');

    if (user.avatarUrl) {
      const oldFilePath = path.join(process.cwd(), user.avatarUrl);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    const avatarUrl = `/uploads/avatars/${file.filename}`;

    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatarUrl: true,
        bio: true,
        updatedAt: true,
      },
    });
  }

  async getUserStats(userId: string) {
    const totalPagesResult = await this.prisma.readingSession.aggregate({
      where: { userBook: { userId } },
      _sum: { pagesRead: true },
    });
    const totalPagesRead = totalPagesResult._sum.pagesRead ?? 0;

    const completedBooksCount = await this.prisma.userBook.count({
      where: { userId, status: UserBookStatus.COMPLETED },
    });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const completedThisMonth = await this.prisma.userBook.count({
      where: {
        userId,
        status: UserBookStatus.COMPLETED,
        finishedAt: { gte: startOfMonth },
      },
    });

    const sessions = await this.prisma.readingSession.findMany({
      where: { userBook: { userId } },
      select: { date: true },
      orderBy: { date: 'desc' },
    });

    const uniqueDates = Array.from(
      new Set(sessions.map((s) => s.date.toISOString().split('T')[0])),
    );

    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    let checkDate = uniqueDates.includes(today)
      ? new Date()
      : uniqueDates.includes(yesterday)
        ? yesterdayDate
        : null;

    if (checkDate) {
      while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (uniqueDates.includes(dateStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    const userBooks = await this.prisma.userBook.findMany({
      where: { userId },
      include: { book: { select: { genres: true } } },
    });

    const genreCount: Record<string, number> = {};
    userBooks.forEach((ub) => {
      ub.book.genres.forEach((genre) => {
        genreCount[genre] = (genreCount[genre] || 0) + 1;
      });
    });

    const favoriteGenres = Object.entries(genreCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([genre]) => genre);

    return {
      totalPagesRead,
      completedBooksCount,
      completedThisMonth,
      currentStreak,
      favoriteGenres,
    };
  }
}
