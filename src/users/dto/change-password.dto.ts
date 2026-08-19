import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'SenhaAntiga123',
    description: 'Senha atual do usuário',
  })
  @IsString()
  @IsNotEmpty()
  oldPassword!: string;

  @ApiProperty({
    example: 'NovaSenha123',
    description: 'Nova senha (mínimo 6 caracteres)',
  })
  @IsString()
  @MinLength(6)
  newPassword!: string;
}
