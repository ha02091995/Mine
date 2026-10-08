import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { parseBody } from '../common/http';
import { AuthContext, CurrentAuth } from '../identity/auth.context';
import { AuthGuard } from '../identity/auth.guard';
import { SecretService } from './secret.service';

const SecretSchema = z.object({
  kind: z.enum(['text', 'image']),
  body: z.string().trim().min(1).max(4000).optional(),
  imageRef: z.string().trim().min(1).max(200).optional(),
});

@Controller('secret-messages')
@UseGuards(AuthGuard)
export class SecretController {
  constructor(private readonly secrets: SecretService) {}

  @Get()
  list(@CurrentAuth() auth: AuthContext) {
    return this.secrets.list(auth.userId);
  }

  @Post()
  create(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    return this.secrets.create(auth.userId, parseBody(SecretSchema, body));
  }

  @Post(':id/reveal')
  reveal(@CurrentAuth() auth: AuthContext, @Param('id') id: string) {
    return this.secrets.reveal(auth.userId, id);
  }
}
