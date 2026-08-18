import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { GetUserId } from '../common/decorators/get-user-id.decorator';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Obter dados do usuário logado' })
  @ApiResponse({ status: 200, description: 'Dados do perfil do usuário' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  getMe(@GetUserId() userId: string) {
    return this.usersService.findById(userId);
  }
}
