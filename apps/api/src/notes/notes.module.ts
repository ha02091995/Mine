import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { PairModule } from '../pair/pair.module';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';

@Module({
  imports: [IdentityModule, PairModule],
  controllers: [NotesController],
  providers: [NotesService],
})
export class NotesModule {}
