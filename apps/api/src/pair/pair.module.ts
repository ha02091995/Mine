import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { MembershipService } from './membership.service';
import { PairController } from './pair.controller';
import { PairService } from './pair.service';

@Module({
  imports: [IdentityModule],
  controllers: [PairController],
  providers: [PairService, MembershipService],
  exports: [PairService, MembershipService],
})
export class PairModule {}
