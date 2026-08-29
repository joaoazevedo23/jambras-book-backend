import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CompetitionsService } from './competitions.service';
import { CreateCompetitionDto } from './dto';
import { GetUserId } from '../common/decorators/get-user-id.decorator';

@ApiTags('Competitions')
@ApiBearerAuth('access-token')
@Controller('competitions')
export class CompetitionsController {
  constructor(private readonly competitionsService: CompetitionsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar uma nova competição de leitura' })
  @ApiResponse({ status: 201, description: 'Competição criada com sucesso' })
  create(@GetUserId() userId: string, @Body() dto: CreateCompetitionDto) {
    return this.competitionsService.create(userId, dto);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Entrar em uma competição existente' })
  @ApiResponse({ status: 201, description: 'Inscrição realizada com sucesso' })
  @ApiResponse({ status: 409, description: 'Você já está participando' })
  join(@GetUserId() userId: string, @Param('id') competitionId: string) {
    return this.competitionsService.joinCompetition(userId, competitionId);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar competições em que o usuário está participando',
  })
  @ApiResponse({ status: 200, description: 'Lista de competições' })
  findAll(@GetUserId() userId: string) {
    return this.competitionsService.findAll(userId);
  }

  @Get(':id/leaderboard')
  @ApiOperation({
    summary: 'Obter o ranking e progresso dos participantes em tempo real',
  })
  @ApiResponse({ status: 200, description: 'Leaderboard retornado' })
  @ApiResponse({ status: 404, description: 'Competição não encontrada' })
  getLeaderboard(@Param('id') competitionId: string) {
    return this.competitionsService.getLeaderboard(competitionId);
  }
}
