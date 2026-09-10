import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { ActivitiesModule } from 'src/activities/activities.module';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [HttpModule, ActivitiesModule, NotificationsModule],
  controllers: [BooksController],
  providers: [BooksService],
})
export class BooksModule {}
