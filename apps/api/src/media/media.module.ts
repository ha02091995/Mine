import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { PairModule } from '../pair/pair.module';
import { AlbumsController } from './albums.controller';
import { AlbumsService } from './albums.service';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { StoryController } from './story.controller';
import { StoryService } from './story.service';

@Module({
  imports: [IdentityModule, PairModule],
  controllers: [MediaController, AlbumsController, StoryController],
  providers: [MediaService, AlbumsService, StoryService],
  exports: [MediaService],
})
export class MediaModule {}
