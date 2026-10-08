import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { parseBody } from '../common/http';
import { AuthContext, CurrentAuth } from '../identity/auth.context';
import { AuthGuard } from '../identity/auth.guard';
import { StatusService } from './status.service';

const StatusSchema = z.object({
  batteryEnabled: z.boolean(),
  batteryPercent: z.number().int().min(0).max(100).optional(),
  locationEnabled: z.boolean(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

@Controller()
@UseGuards(AuthGuard)
export class StatusController {
  constructor(private readonly status: StatusService) {}

  @Put('me/status')
  update(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    return this.status.update(auth.userId, parseBody(StatusSchema, body));
  }

  @Get('partners/:id/status')
  partner(@CurrentAuth() auth: AuthContext, @Param('id') id: string) {
    return this.status.partner(auth.userId, id);
  }

  @Get('me/weather')
  weather(@CurrentAuth() auth: AuthContext) {
    return this.status.weather(auth.userId);
  }
}
