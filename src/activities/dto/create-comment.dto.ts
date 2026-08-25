import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({
    example: 'Ótimo progresso! Esse capítulo é sensacional.',
    description: 'Conteúdo do comentário',
  })
  @IsString()
  @IsNotEmpty()
  content!: string;
}
