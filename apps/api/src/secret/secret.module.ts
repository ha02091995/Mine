import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { PairModule } from '../pair/pair.module';
import { SecretController } from './secret.controller';
import { SecretService } from './secret.service';

@Module({
  imports: [IdentityModule, PairModule],
  controllers: [SecretController],
  providers: [SecretService],
})
export class SecretModule {}