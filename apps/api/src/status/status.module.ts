import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { PairModule } from '../pair/pair.module';
import { StatusController } from './status.controller';
import { StatusService } from './status.service';

@Module({
  imports: [IdentityModule, PairModule],
  controllers: [StatusController],
  providers: [StatusService],
})
export class StatusModule {}
