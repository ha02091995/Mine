import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatModule } from './chat/chat.module';
import { DatesModule } from './dates/dates.module';
import { HealthController } from './health.controller';
import { IdentityModule } from './identity/identity.module';
import { MediaModule } from './media/media.module';
import { NotesModule } from './notes/notes.module';
import { PairModule } from './pair/pair.module';
import { SecretModule } from './secret/secret.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    IdentityModule,
    PairModule,
    NotesModule,
    DatesModule,
    ChatModule,
    SecretModule,
    MediaModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
