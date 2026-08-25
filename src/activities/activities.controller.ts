import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { CreateCommentDto } from './dto';
import { GetUserId } from '../common/decorators/get-user-id.decorator';

@ApiTags('Activities')
@ApiBearerAuth('access-token')
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get('feed')
  @ApiOperation({
    summary: 'Listar feed de atividades (suas e dos seus amigos)',
  })
  @ApiResponse({ status: 200, description: 'Feed retornado com sucesso' })
  getFeed(
    @GetUserId() userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.activitiesService.getFeed(
      userId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
  }

  @Post(':id/like')
  @ApiOperation({ summary: 'Curtir uma atividade' })
  @ApiResponse({ status: 201, description: 'Atividade curtida' })
  @ApiResponse({ status: 409, description: 'Você já curtiu esta atividade' })
  likeActivity(@GetUserId() userId: string, @Param('id') activityId: string) {
    return this.activitiesService.likeActivity(userId, activityId);
  }

  @Delete(':id/like')
  @ApiOperation({ summary: 'Remover curtida de uma atividade' })
  @ApiResponse({ status: 200, description: 'Curtida removida' })
  unlikeActivity(@GetUserId() userId: string, @Param('id') activityId: string) {
    return this.activitiesService.unlikeActivity(userId, activityId);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Comentar em uma atividade' })
  @ApiResponse({ status: 201, description: 'Comentário adicionado' })
  addComment(
    @GetUserId() userId: string,
    @Param('id') activityId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.activitiesService.addComment(userId, activityId, dto);
  }

  @Delete('comments/:commentId')
  @ApiOperation({ summary: 'Remover um comentário' })
  @ApiResponse({ status: 200, description: 'Comentário removido' })
  removeComment(
    @GetUserId() userId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.activitiesService.removeComment(userId, commentId);
  }
}
