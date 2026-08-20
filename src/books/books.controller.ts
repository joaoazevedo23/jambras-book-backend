import {
  Body,
  Controller,
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
import { CreateBookDto, FilterBookDto, UpdateUserBookDto } from './dto';
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
}
