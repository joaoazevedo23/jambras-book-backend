import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FriendshipsService } from './friendships.service';
import { RespondFriendshipRequestDto } from './dto';
import { GetUserId } from '../common/decorators/get-user-id.decorator';

@ApiTags('Friendships')
@ApiBearerAuth('access-token')
@Controller('friendships')
export class FriendshipsController {
  constructor(private readonly friendshipsService: FriendshipsService) {}

  @Post('request/:addresseeId')
  @ApiOperation({ summary: 'Enviar pedido de amizade' })
  @ApiResponse({ status: 201, description: 'Pedido enviado com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Não pode enviar pedido para si mesmo',
  })
  @ApiResponse({
    status: 409,
    description: 'Já existe um pedido pendente ou amizade aceita',
  })
  sendRequest(
    @GetUserId() userId: string,
    @Param('addresseeId') addresseeId: string,
  ) {
    return this.friendshipsService.sendRequest(userId, addresseeId);
  }

  @Patch('requests/:requestId/respond')
  @ApiOperation({ summary: 'Aceitar ou recusar pedido de amizade' })
  @ApiResponse({ status: 200, description: 'Pedido respondido com sucesso' })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
  respondRequest(
    @GetUserId() userId: string,
    @Param('requestId') requestId: string,
    @Body() dto: RespondFriendshipRequestDto,
  ) {
    return this.friendshipsService.respondRequest(userId, requestId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os amigos do usuário logado' })
  @ApiResponse({ status: 200, description: 'Lista de amigos retornada' })
  getFriends(@GetUserId() userId: string) {
    return this.friendshipsService.getFriends(userId);
  }

  @Get('requests/pending')
  @ApiOperation({ summary: 'Listar pedidos de amizade recebidos pendentes' })
  @ApiResponse({ status: 200, description: 'Lista de solicitações pendentes' })
  getPendingRequests(@GetUserId() userId: string) {
    return this.friendshipsService.getPendingRequests(userId);
  }

  @Delete(':friendId')
  @ApiOperation({ summary: 'Remover amizade ou cancelar solicitação' })
  @ApiResponse({ status: 200, description: 'Amizade removida com sucesso' })
  @ApiResponse({ status: 404, description: 'Vínculo não encontrado' })
  removeFriendship(
    @GetUserId() userId: string,
    @Param('friendId') friendId: string,
  ) {
    return this.friendshipsService.removeFriendship(userId, friendId);
  }
}
