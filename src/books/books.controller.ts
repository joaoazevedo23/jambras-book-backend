import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BooksService } from './books.service';
import {
  CreateBookDto,
  FilterBookDto,
  UpdateUserBookDto,
  CreateReadingSessionDto,
} from './dto';
import { Public } from '../common/decorators/public.decorator';
import { GetUserId } from '../common/decorators/get-user-id.decorator';
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

  // Temporariamente desabilitado: coverUrl é um atributo global do catálogo
  // e ainda não existe modelo de autorização/moderação — qualquer usuário
  // autenticado poderia sobrescrever a capa de qualquer livro. Sem o
  // FileInterceptor, o Multer nunca grava o arquivo enviado. Reabilitar
  // somente junto com uma política de autorização (ver auditoria de
  // autorização do endpoint).
  @Patch(':id/cover')
  @ApiOperation({
    summary:
      'Atualizar a imagem de capa do livro (temporariamente desabilitado)',
  })
  @ApiResponse({
    status: 403,
    description:
      'Upload de capas desabilitado até existir modelo de autorização e moderação',
  })
  uploadCover(): never {
    throw new ForbiddenException(
      'Upload de capas está temporariamente desabilitado',
    );
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
