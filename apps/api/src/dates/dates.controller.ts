import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { parseBody } from '../common/http';
import { AuthContext, CurrentAuth } from '../identity/auth.context';
import { AuthGuard } from '../identity/auth.guard';
import { DatesService } from './dates.service';

const EventSchema = z.object({
  title: z.string().trim().min(1).max(120),
  startsAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date'),
  timezone: z.string().trim().min(1).max(64),
  kind: z.enum(['anniversary', 'birthday', 'plan']),
  remindOffsetMinutes: z.number().int().min(0).max(60 * 24 * 30).optional(),
});

@Controller('events')
@UseGuards(AuthGuard)
export class DatesController {
  constructor(private readonly dates: DatesService) {}

  @Get()
  list(@CurrentAuth() auth: AuthContext) {
    return this.dates.list(auth.userId);
  }

  @Post()
  create(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    return this.dates.create(auth.userId, parseBody(EventSchema, body));
  }
}
