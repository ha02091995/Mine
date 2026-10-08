import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { PairModule } from '../pair/pair.module';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';

@Module({
  imports: [IdentityModule, PairModule],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
})
export class ChatModule {}
