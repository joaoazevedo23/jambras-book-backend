import { ApiPropertyOptional } from '@nestjs/swagger';
import { TrackingMode } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReadingSessionDto {
  @ApiPropertyOptional({
    enum: TrackingMode,
    example: TrackingMode.PAGES,
    description: 'Modo de acompanhamento (PAGES ou CHAPTERS)',
  })
  @IsOptional()
  @IsEnum(TrackingMode)
  mode?: TrackingMode = TrackingMode.PAGES;

  @ApiPropertyOptional({ example: 0, description: 'Página inicial da leitura' })
  @IsOptional()
  @IsInt()
  @Min(0)
  startPage?: number;

  @ApiPropertyOptional({ example: 25, description: 'Página final da leitura' })
  @IsOptional()
  @IsInt()
  @Min(0)
  endPage?: number;

  @ApiPropertyOptional({ example: 1, description: 'Capítulo inicial' })
  @IsOptional()
  @IsInt()
  @Min(0)
  startChapter?: number;

  @ApiPropertyOptional({ example: 3, description: 'Capítulo final' })
  @IsOptional()
  @IsInt()
  @Min(0)
  endChapter?: number;

  @ApiPropertyOptional({ example: 8, description: 'Nota da sessão de 1 a 10' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  rating?: number;

  @ApiPropertyOptional({
    example: 'Capítulo tenso! Muita revelação sobre a trama.',
    description: 'Anotações sobre a sessão',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
