import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { parseBody } from '../common/http';
import { AuthContext, CurrentAuth } from '../identity/auth.context';
import { AuthGuard } from '../identity/auth.guard';
import { ChatService } from './chat.service';

const MessageSchema = z.object({
  clientMsgId: z.string().trim().min(1).max(80),
  kind: z.enum(['text', 'sticker']),
  body: z.string().trim().min(1).max(4000).optional(),
  stickerId: z.string().trim().min(1).max(40).optional(),
});

@Controller('partnerships/:partnershipId')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('messages')
  list(@CurrentAuth() auth: AuthContext, @Param('partnershipId') partnershipId: string) {
    return this.chat.list(auth.userId, partnershipId);
  }

  @Post('messages')
  create(
    @CurrentAuth() auth: AuthContext,
    @Param('partnershipId') partnershipId: string,
    @Body() body: unknown,
  ) {
    return this.chat.create(auth.userId, partnershipId, parseBody(MessageSchema, body));
  }

  @Post('messages/:messageId/read')
  read(
    @CurrentAuth() auth: AuthContext,
    @Param('partnershipId') partnershipId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.chat.markRead(auth.userId, partnershipId, messageId);
  }
}
