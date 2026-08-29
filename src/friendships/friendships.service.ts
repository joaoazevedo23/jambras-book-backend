import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FriendshipStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RespondFriendshipRequestDto } from './dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class FriendshipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async sendRequest(requesterId: string, addresseeId: string) {
    if (requesterId === addresseeId) {
      throw new BadRequestException(
        'Você não pode enviar pedido de amizade para si mesmo',
      );
    }

    const addressee = await this.prisma.user.findUnique({
      where: { id: addresseeId },
    });

    if (!addressee) {
      throw new NotFoundException('Usuário destinatário não encontrado');
    }

    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
    });

    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
    });

    if (existing) {
      if (existing.status === FriendshipStatus.ACCEPTED) {
        throw new ConflictException('Vocês já são amigos');
      }
      if (existing.status === FriendshipStatus.PENDING) {
        throw new ConflictException('Já existe um pedido de amizade pendente');
      }
    }

    const friendship = await this.prisma.friendship.create({
      data: {
        requesterId,
        addresseeId,
        status: FriendshipStatus.PENDING,
      },
      include: {
        addressee: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
      },
    });

    await this.notificationsService.createNotification({
      userId: addresseeId,
      type: NotificationType.FRIEND_REQUEST,
      title: 'Novo pedido de amizade',
      message: `${requester?.name ?? 'Alguém'} enviou uma solicitação de amizade para você.`,
      linkUrl: `/friends/requests`,
    });

    return friendship;
  }

  async respondRequest(
    userId: string,
    requestId: string,
    dto: RespondFriendshipRequestDto,
  ) {
    const request = await this.prisma.friendship.findUnique({
      where: { id: requestId },
    });

    if (!request || request.addresseeId !== userId) {
      throw new NotFoundException('Solicitação de amizade não encontrada');
    }

    if (request.status !== FriendshipStatus.PENDING) {
      throw new BadRequestException('Esta solicitação já foi respondida');
    }

    if (
      dto.status !== FriendshipStatus.ACCEPTED &&
      dto.status !== FriendshipStatus.REJECTED
    ) {
      throw new BadRequestException('Status inválido para resposta');
    }

    const updated = await this.prisma.friendship.update({
      where: { id: requestId },
      data: { status: dto.status },
      include: {
        addressee: { select: { name: true } },
      },
    });

    if (dto.status === FriendshipStatus.ACCEPTED) {
      await this.notificationsService.createNotification({
        userId: updated.requesterId,
        type: NotificationType.FRIEND_ACCEPTED,
        title: 'Pedido de amizade aceito!',
        message: `${updated.addressee.name} aceitou sua solicitação de amizade.`,
        linkUrl: `/friends`,
      });
    }

    return updated;
  }

  async getFriends(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
            bio: true,
          },
        },
        addressee: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
            bio: true,
          },
        },
      },
    });

    return friendships.map((f) =>
      f.requesterId === userId ? f.addressee : f.requester,
    );
  }

  async getPendingRequests(userId: string) {
    return this.prisma.friendship.findMany({
      where: {
        addresseeId: userId,
        status: FriendshipStatus.PENDING,
      },
      include: {
        requester: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removeFriendship(userId: string, friendId: string) {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId: friendId },
          { requesterId: friendId, addresseeId: userId },
        ],
      },
    });

    if (!friendship) {
      throw new NotFoundException('Vínculo de amizade não encontrado');
    }

    await this.prisma.friendship.delete({
      where: { id: friendship.id },
    });

    return { message: 'Amizade removida com sucesso' };
  }
}
