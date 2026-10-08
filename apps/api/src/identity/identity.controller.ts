import { Body, Controller, Delete, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { parseBody } from '../common/http';
import { AuthContext, CurrentAuth } from './auth.context';
import { AuthGuard } from './auth.guard';
import { IdentityService } from './identity.service';

const OtpSchema = z.object({
  destination: z.string().trim().min(3).max(200),
});

const SessionSchema = z.object({
  destination: z.string().trim().min(3).max(200),
  code: z.string().regex(/^\d{6}$/),
  device: z.object({
    platform: z.string().trim().min(1).max(32),
    pushToken: z.string().trim().min(1).max(512).optional(),
  }),
});

const RefreshSchema = z.object({
  refreshToken: z.string().min(20).max(500),
});

@Controller('auth')
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

  @Post('otp')
  requestOtp(@Body() body: unknown) {
    return this.identity.requestOtp(parseBody(OtpSchema, body).destination);
  }

  @Post('sessions')
  createSession(@Body() body: unknown) {
    return this.identity.createSession(parseBody(SessionSchema, body));
  }

  @Post('sessions/refresh')
  refresh(@Body() body: unknown) {
    return this.identity.refresh(parseBody(RefreshSchema, body).refreshToken);
  }

  @Delete('sessions')
  @UseGuards(AuthGuard)
  logout(@CurrentAuth() auth: AuthContext) {
    return this.identity.logout(auth.sessionId);
  }
}
