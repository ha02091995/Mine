import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { parseBody } from '../common/http';
import { AuthContext, CurrentAuth } from '../identity/auth.context';
import { AuthGuard } from '../identity/auth.guard';
import { PairService } from './pair.service';

@Controller()
@UseGuards(AuthGuard)
export class PairController {
  constructor(private readonly pairs: PairService) {}

  @Post('invites')
  createInvite(@CurrentAuth() auth: AuthContext) {
    return this.pairs.createInvite(auth.userId);
  }

  @Post('invites/:code/accept')
  accept(@CurrentAuth() auth: AuthContext, @Param('code') code: string) {
    return this.pairs.accept(auth.userId, code);
  }

  @Get('partnership')
  getPartnership(@CurrentAuth() auth: AuthContext) {
    return this.pairs.getForUser(auth.userId);
  }

  @Patch('partnership')
  updatePartnership(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    const parsed = parseBody(
      z.object({ startedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
      body,
    );
    return this.pairs.updateStartedOn(auth.userId, parsed.startedOn);
  }

  @Post('partnerships/:id/leave')
  leave(@CurrentAuth() auth: AuthContext, @Param('id') id: string) {
    return this.pairs.leave(auth.userId, id);
  }
}
