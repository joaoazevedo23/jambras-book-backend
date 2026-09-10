import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { isAxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateBookDto,
  FilterBookDto,
  UpdateUserBookDto,
  CreateReadingSessionDto,
} from './dto';
import {
  ActivityType,
  UserBookStatus,
  TrackingMode,
  NotificationType,
} from '@prisma/client';
import { ActivitiesService } from 'src/activities/activities.service';
import { NotificationsService } from './../notifications/notifications.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';

interface GoogleBooksIndustryIdentifier {
  type: string;
  identifier: string;
}

interface GoogleBooksVolumeInfo {
  title?: string;
  authors?: string[];
  description?: string;
  imageLinks?: {
    thumbnail?: string;
  };
  pageCount?: number;
  industryIdentifiers?: GoogleBooksIndustryIdentifier[];
  categories?: string[];
}

interface GoogleBooksItem {
  id: string;
  volumeInfo?: GoogleBooksVolumeInfo;
}

interface GoogleBooksSearchResponse {
  items?: GoogleBooksItem[];
}

@Injectable()
export class BooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activitiesService: ActivitiesService,
    private readonly notificationsService: NotificationsService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private getApiKeyParam(): string {
    const apiKey = this.configService.get<string>('GOOGLE_BOOKS_API_KEY');
    return apiKey ? `&key=${apiKey}` : '';
  }

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

  async searchExternal(query: string) {
    if (!query) {
      return [];
    }

    try {
      const apiKeyParam = this.getApiKeyParam();
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10${apiKeyParam}`;
      const response = await firstValueFrom(
        this.httpService.get<GoogleBooksSearchResponse>(url),
      );
      const data = response.data;

      if (!data.items) {
        return [];
      }

      return data.items.map((item) => {
        const info = item.volumeInfo || {};
        const isbnObj = info.industryIdentifiers?.find(
          (id) => id.type === 'ISBN_13' || id.type === 'ISBN_10',
        );

        return {
          googleBooksId: item.id,
          title: info.title || 'Título não informado',
          author: info.authors ? info.authors.join(', ') : 'Autor desconhecido',
          description: info.description || null,
          coverUrl:
            info.imageLinks?.thumbnail?.replace('http://', 'https://') || null,
          pageCount: info.pageCount || null,
          isbn: isbnObj?.identifier || null,
          genres: info.categories || [],
        };
      });
    } catch (error: any) {
      if (isAxiosError(error) && error.response?.status === 429) {
        throw new HttpException(
          'Cota de requisições do Google Books excedida. Tente novamente mais tarde ou adicione uma GOOGLE_BOOKS_API_KEY no .env.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new ServiceUnavailableException(
        'Erro ao consultar a API do Google Books',
      );
    }
  }

  async importFromGoogle(googleBooksId: string) {
    const existingBook = await this.prisma.book.findUnique({
      where: { googleBooksId },
    });

    if (existingBook) {
      return existingBook;
    }

    try {
      const apiKeyParam = this.getApiKeyParam();
      const url = `https://www.googleapis.com/books/v1/volumes/${googleBooksId}?${apiKeyParam.replace('&', '')}`;
      const response = await firstValueFrom(
        this.httpService.get<GoogleBooksItem>(url),
      );
      const data = response.data;

      if (!data || !data.volumeInfo) {
        throw new NotFoundException('Livro não encontrado no Google Books');
      }

      const info = data.volumeInfo;
      const isbnObj = info.industryIdentifiers?.find(
        (id) => id.type === 'ISBN_13' || id.type === 'ISBN_10',
      );
      const isbn = isbnObj?.identifier;

      if (isbn) {
        const existingByIsbn = await this.prisma.book.findUnique({
          where: { isbn },
        });
        if (existingByIsbn) {
          return this.prisma.book.update({
            where: { id: existingByIsbn.id },
            data: { googleBooksId },
          });
        }
      }

      return this.prisma.book.create({
        data: {
          googleBooksId,
          isbn: isbn || null,
          title: info.title || 'Título não informado',
          author: info.authors ? info.authors.join(', ') : 'Autor desconhecido',
          description: info.description || null,
          coverUrl:
            info.imageLinks?.thumbnail?.replace('http://', 'https://') || null,
          pageCount: info.pageCount || null,
          genres: info.categories || [],
        },
      });
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (isAxiosError(error) && error.response?.status === 429) {
        throw new HttpException(
          'Cota de requisições do Google Books excedida.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new ServiceUnavailableException(
        'Erro ao importar livro do Google Books',
      );
    }
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

  async updateCover(bookId: string, file: Express.Multer.File) {
    const book = await this.findById(bookId);

    if (book.coverUrl && book.coverUrl.startsWith('/uploads/')) {
      const oldFilePath = path.join(process.cwd(), book.coverUrl);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    const coverUrl = `/uploads/covers/${file.filename}`;

    return this.prisma.book.update({
      where: { id: bookId },
      data: { coverUrl },
    });
  }

  async createReadingSession(
    userId: string,
    userBookId: string,
    dto: CreateReadingSessionDto,
  ) {
    const userBook = await this.prisma.userBook.findFirst({
      where: { id: userBookId, userId },
      include: { book: true },
    });

    if (!userBook) {
      throw new NotFoundException('Livro não encontrado na sua estante');
    }

    const startPage = dto.startPage ?? userBook.currentPage;
    const endPage = dto.endPage ?? startPage;
    const pagesRead = Math.max(0, endPage - startPage);

    const startChapter = dto.startChapter ?? userBook.currentChapter;
    const endChapter = dto.endChapter ?? startChapter;
    const chaptersRead = Math.max(0, endChapter - startChapter);

    const session = await this.prisma.readingSession.create({
      data: {
        userBookId,
        mode: dto.mode ?? TrackingMode.PAGES,
        startPage,
        endPage,
        startChapter,
        endChapter,
        pagesRead,
        chaptersRead,
        rating: dto.rating,
        notes: dto.notes,
      },
    });

    let newStatus = userBook.status;
    const now = new Date();

    if (
      userBook.status === UserBookStatus.WANT_TO_READ &&
      (pagesRead > 0 || chaptersRead > 0)
    ) {
      newStatus = UserBookStatus.READING;
    }

    if (userBook.book.pageCount && endPage >= userBook.book.pageCount) {
      newStatus = UserBookStatus.COMPLETED;
    }

    await this.prisma.userBook.update({
      where: { id: userBookId },
      data: {
        currentPage: Math.max(userBook.currentPage, endPage),
        currentChapter: Math.max(userBook.currentChapter, endChapter),
        status: newStatus,
        startedAt:
          userBook.startedAt ??
          (newStatus === UserBookStatus.READING ? now : undefined),
        finishedAt:
          newStatus === UserBookStatus.COMPLETED ? now : userBook.finishedAt,
      },
    });

    await this.activitiesService.logActivity({
      userId,
      type: ActivityType.READING_SESSION,
      readingSessionId: session.id,
    });

    if (
      userBook.status !== UserBookStatus.COMPLETED &&
      newStatus === UserBookStatus.COMPLETED
    ) {
      await this.notificationsService.createNotification({
        userId,
        type: NotificationType.BOOK_COMPLETED,
        title: 'Parabéns! Livro concluído! 🎉',
        message: `Você finalizou a leitura de "${userBook.book.title}".`,
        linkUrl: `/shelf`,
      });
    }

    return session;
  }

  async getReadingSessions(userId: string, userBookId: string) {
    const userBook = await this.prisma.userBook.findFirst({
      where: { id: userBookId, userId },
    });

    if (!userBook) {
      throw new NotFoundException('Livro não encontrado na sua estante');
    }

    return this.prisma.readingSession.findMany({
      where: { userBookId },
      orderBy: { date: 'desc' },
    });
  }
}
