import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { MediaModule } from '../media/media.module';
import { PairModule } from '../pair/pair.module';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({
  imports: [IdentityModule, PairModule, MediaModule],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
