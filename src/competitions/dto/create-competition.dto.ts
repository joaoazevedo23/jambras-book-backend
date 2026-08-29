import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateCompetitionDto {
  @ApiProperty({
    example: 'Desafio Entendendo Algoritmos',
    description: 'Nome da competição',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: '1dafe1ac-856c-4050-9491-e600e53215a4',
    description: 'ID do livro desafiado',
  })
  @IsUUID()
  @IsNotEmpty()
  bookId!: string;

  @ApiProperty({
    example: '2026-09-01T00:00:00.000Z',
    description: 'Data de início',
  })
  @Type(() => Date)
  @IsDate()
  startDate!: Date;

  @ApiPropertyOptional({
    example: '2026-09-30T00:00:00.000Z',
    description: 'Data de término',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;
}
