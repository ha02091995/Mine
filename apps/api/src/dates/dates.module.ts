import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { NotifyService } from '../notify/notify.service';
import { PairModule } from '../pair/pair.module';
import { DatesController } from './dates.controller';
import { DatesService } from './dates.service';

@Module({
  imports: [IdentityModule, PairModule],
  controllers: [DatesController],
  providers: [DatesService, NotifyService],
})
export class DatesModule {}