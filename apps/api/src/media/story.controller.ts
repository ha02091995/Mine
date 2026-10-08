import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { parseBody } from '../common/http';
import { AuthContext, CurrentAuth } from '../identity/auth.context';
import { AuthGuard } from '../identity/auth.guard';
import { StoryService } from './story.service';

const StorySchema = z
  .object({
    noteId: z.string().uuid().optional(),
    mediaId: z.string().uuid().optional(),
    caption: z.string().trim().max(500).default(''),
    position: z.number().int().min(0).max(10_000).optional(),
  })
  .strict();

@Controller('story-entries')
@UseGuards(AuthGuard)
export class StoryController {
  constructor(private readonly story: StoryService) {}

  @Get()
  list(@CurrentAuth() auth: AuthContext) {
    return this.story.list(auth.userId);
  }

  @Post()
  create(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    const input = parseBody(StorySchema, body);
    return this.story.create(auth.userId, { ...input, caption: input.caption ?? '' });
  }
}
