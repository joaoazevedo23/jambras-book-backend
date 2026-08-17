import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'usuario@email.com',
    description: 'E-mail do usuário',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'dev_user', description: 'Nome de usuário único' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: 'Nome Sobrenome', description: 'Nome completo' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 'Senha@123',
    description: 'Senha (mínimo 6 caracteres)',
  })
  @IsString()
  @MinLength(6)
  password!: string;
}
