import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserBookStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateUserBookDto {
  @ApiPropertyOptional({
    enum: UserBookStatus,
    example: UserBookStatus.READING,
    description:
      'Status da leitura (WANT_TO_READ, READING, COMPLETED, PAUSED, ABANDONED)',
  })
  @IsOptional()
  @IsEnum(UserBookStatus)
  status?: UserBookStatus;

  @ApiPropertyOptional({ example: 45, description: 'Página atual' })
  @IsOptional()
  @IsInt()
  @Min(0)
  currentPage?: number;

  @ApiPropertyOptional({ example: 4, description: 'Capítulo atual' })
  @IsOptional()
  @IsInt()
  @Min(0)
  currentChapter?: number;

  @ApiPropertyOptional({ example: 5, description: 'Nota de 1 a 5' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    example: 'Livro incrível, recomendo!',
    description: 'Resenha ou opinião geral',
  })
  @IsOptional()
  @IsString()
  review?: string;
}
