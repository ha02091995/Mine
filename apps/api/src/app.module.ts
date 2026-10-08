import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { IdentityModule } from './identity/identity.module';
import { PairModule } from './pair/pair.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    IdentityModule,
    PairModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
