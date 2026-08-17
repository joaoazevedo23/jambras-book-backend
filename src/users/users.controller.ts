import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';
import { GetUserId } from '../common/decorators/get-user-id.decorator';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getMe(@GetUserId() userId: string) {
    return this.usersService.findById(userId);
  }
}
