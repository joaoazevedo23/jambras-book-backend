import { ApiProperty } from '@nestjs/swagger';
import { FriendshipStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class RespondFriendshipRequestDto {
  @ApiProperty({
    enum: FriendshipStatus,
    example: FriendshipStatus.ACCEPTED,
    description: 'Ação para o pedido de amizade (ACCEPTED ou REJECTED)',
  })
  @IsNotEmpty()
  @IsEnum(FriendshipStatus)
  status!: FriendshipStatus;
}
