import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookDto, FilterBookDto, UpdateUserBookDto } from './dto';
import { UserBookStatus } from '@prisma/client';

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBookDto) {
    if (dto.isbn) {
      const existingBook = await this.prisma.book.findUnique({
        where: { isbn: dto.isbn },
      });

      if (existingBook) {
        throw new ConflictException(
          'Já existe um livro cadastrado com este ISBN',
        );
      }
    }

    return this.prisma.book.create({
      data: { ...dto },
    });
  }

  async findAll(filters: FilterBookDto) {
    const { search, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { author: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.book.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.book.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const book = await this.prisma.book.findUnique({
      where: { id },
    });

    if (!book) {
      throw new NotFoundException('Livro não encontrado');
    }

    return book;
  }
  async updateShelf(userId: string, bookId: string, dto: UpdateUserBookDto) {
    await this.findById(bookId);

    const now = new Date();
    const finishedAt =
      dto.status === UserBookStatus.COMPLETED ? now : undefined;
    const startedAt = dto.status === UserBookStatus.READING ? now : undefined;

    return this.prisma.userBook.upsert({
      where: {
        userId_bookId: { userId, bookId },
      },
      create: {
        userId,
        bookId,
        status: dto.status ?? UserBookStatus.WANT_TO_READ,
        currentPage: dto.currentPage ?? 0,
        currentChapter: dto.currentChapter ?? 0,
        rating: dto.rating,
        review: dto.review,
        startedAt,
        finishedAt,
      },
      update: {
        ...dto,
        ...(startedAt && { startedAt }),
        ...(finishedAt && { finishedAt }),
      },
      include: {
        book: true,
      },
    });
  }

  async getUserShelf(userId: string, status?: UserBookStatus) {
    return this.prisma.userBook.findMany({
      where: {
        userId,
        ...(status && { status }),
      },
      include: {
        book: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
