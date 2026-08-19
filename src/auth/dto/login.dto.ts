import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'teste@email.com',
    description: 'E-mail ou nome de usuário',
  })
  @IsString({ message: 'login must be a string' })
  @IsNotEmpty({ message: 'E-mail ou username é obrigatório' })
  login!: string;

  @ApiProperty({
    example: 'Senha@123',
    description: 'Senha do usuário',
  })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
