import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class CreateBookDto {
  @ApiProperty({ example: 'O Hobbit', description: 'Título do livro' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'J.R.R. Tolkien', description: 'Autor do livro' })
  @IsString()
  @IsNotEmpty()
  author!: string;

  @ApiPropertyOptional({
    example: '9788551006740',
    description: 'Código ISBN do livro',
  })
  @IsOptional()
  @IsString()
  isbn?: string;

  @ApiPropertyOptional({
    example: 'Uma grande aventura pela Terra Média...',
    description: 'Sinopse ou descrição do livro',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://exemplo.com/capa.jpg',
    description: 'URL da imagem da capa',
  })
  @IsOptional()
  @IsUrl()
  coverUrl?: string;

  @ApiPropertyOptional({ example: 310, description: 'Total de páginas' })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageCount?: number;

  @ApiPropertyOptional({ example: 19, description: 'Total de capítulos' })
  @IsOptional()
  @IsInt()
  @Min(1)
  chapterCount?: number;

  @ApiPropertyOptional({
    example: ['Fantasia', 'Aventura'],
    description: 'Gêneros literários',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  genres?: string[];
}
