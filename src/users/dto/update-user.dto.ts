import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'Gael Guzman',
    description: 'Nome do usuário',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'galesTV',
    description: 'Nome de usuário único',
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({
    example: 'Entusiasta de tecnologia e leitor assíduo',
    description: 'Biografia do perfil',
  })
  @IsOptional()
  @IsString()
  bio?: string;
}
