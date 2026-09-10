import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Patch,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { BooksService } from './books.service';
import {
  CreateBookDto,
  FilterBookDto,
  UpdateUserBookDto,
  CreateReadingSessionDto,
} from './dto';
import { Public } from '../common/decorators/public.decorator';
import { GetUserId } from 'src/common/decorators/get-user-id.decorator';
import { UserBookStatus } from '@prisma/client';

@ApiTags('Books')
@ApiBearerAuth('access-token')
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar um novo livro' })
  @ApiResponse({ status: 201, description: 'Livro criado com sucesso' })
  @ApiResponse({ status: 409, description: 'ISBN já cadastrado' })
  create(@Body() dto: CreateBookDto) {
    return this.booksService.create(dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar livros com busca e paginação' })
  @ApiResponse({ status: 200, description: 'Lista de livros retornada' })
  findAll(@Query() filters: FilterBookDto) {
    return this.booksService.findAll(filters);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de um livro pelo ID' })
  @ApiResponse({ status: 200, description: 'Dados do livro' })
  @ApiResponse({ status: 404, description: 'Livro não encontrado' })
  findById(@Param('id') id: string) {
    return this.booksService.findById(id);
  }

  @Get('search/external')
  @ApiOperation({ summary: 'Buscar livros na API externa do Google Books' })
  @ApiResponse({ status: 200, description: 'Resultados da busca externa' })
  searchExternal(@Query('q') query: string) {
    return this.booksService.searchExternal(query);
  }

  @Post('import/:googleBooksId')
  @ApiOperation({
    summary: 'Importar/Cadastrar um livro do Google Books no banco',
  })
  @ApiResponse({ status: 201, description: 'Livro importado com sucesso' })
  importFromGoogle(@Param('googleBooksId') googleBooksId: string) {
    return this.booksService.importFromGoogle(googleBooksId);
  }

  @Patch(':id/shelf')
  @ApiOperation({
    summary: 'Adicionar ou atualizar livro na estante do usuário',
  })
  @ApiResponse({ status: 200, description: 'Estante atualizada com sucesso' })
  @ApiResponse({ status: 404, description: 'Livro não encontrado' })
  updateShelf(
    @GetUserId() userId: string,
    @Param('id') bookId: string,
    @Body() dto: UpdateUserBookDto,
  ) {
    return this.booksService.updateShelf(userId, bookId, dto);
  }

  @Get('user/shelf')
  @ApiOperation({ summary: 'Listar livros da estante do usuário logado' })
  @ApiResponse({ status: 200, description: 'Lista de livros na estante' })
  getUserShelf(
    @GetUserId() userId: string,
    @Query('status') status?: UserBookStatus,
  ) {
    return this.booksService.getUserShelf(userId, status);
  }

  @Patch(':id/cover')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/covers',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `cover-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return callback(
            new BadRequestException(
              'Apenas imagens (jpg, jpeg, png, webp) são permitidas',
            ),
            false,
          );
        }
        callback(null, true);
      },
      limits: { fileSize: 3 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description:
            'Arquivo de imagem para a capa do livro (JPG, JPEG, PNG ou WEBP, máximo 3MB)',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Atualizar a imagem de capa do livro' })
  @ApiResponse({ status: 200, description: 'Capa atualizada com sucesso' })
  @ApiResponse({ status: 404, description: 'Livro não encontrado' })
  uploadCover(
    @Param('id') bookId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado');
    return this.booksService.updateCover(bookId, file);
  }

  @Post('user-books/:userBookId/sessions')
  @ApiOperation({ summary: 'Registrar uma nova sessão de leitura' })
  @ApiResponse({ status: 201, description: 'Sessão registrada com sucesso' })
  @ApiResponse({ status: 404, description: 'Livro não encontrado na estante' })
  createReadingSession(
    @GetUserId() userId: string,
    @Param('userBookId') userBookId: string,
    @Body() dto: CreateReadingSessionDto,
  ) {
    return this.booksService.createReadingSession(userId, userBookId, dto);
  }

  @Get('user-books/:userBookId/sessions')
  @ApiOperation({
    summary: 'Listar histórico de sessões de leitura de um livro',
  })
  @ApiResponse({ status: 200, description: 'Histórico de sessões retornado' })
  getReadingSessions(
    @GetUserId() userId: string,
    @Param('userBookId') userBookId: string,
  ) {
    return this.booksService.getReadingSessions(userId, userBookId);
  }
}
