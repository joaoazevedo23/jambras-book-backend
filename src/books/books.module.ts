import { Module } from '@nestjs/common';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { ActivitiesModule } from 'src/activities/activities.module';

@Module({
  imports: [ActivitiesModule],
  controllers: [BooksController],
  providers: [BooksService],
})
export class BooksModule {}
