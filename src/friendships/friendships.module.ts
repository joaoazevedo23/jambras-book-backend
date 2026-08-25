import { Module } from '@nestjs/common';
import { FriendshipsController } from './friendships.controller';
import { FriendshipsService } from './friendships.service';

@Module({
  controllers: [FriendshipsController],
  providers: [FriendshipsService],
})
export class FriendshipsModule {}
