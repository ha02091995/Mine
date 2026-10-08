import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { PairModule } from '../pair/pair.module';
import { ListsController } from './lists.controller';
import { ListsService } from './lists.service';

@Module({
  imports: [IdentityModule, PairModule],
  controllers: [ListsController],
  providers: [ListsService],
})
export class ListsModule {}
