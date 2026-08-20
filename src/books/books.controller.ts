import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BooksService } from './books.service';
import { CreateBookDto, FilterBookDto } from './dto';
import { Public } from '../common/decorators/public.decorator';

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
}
