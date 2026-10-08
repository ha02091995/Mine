import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { parseBody } from '../common/http';
import { AuthContext, CurrentAuth } from '../identity/auth.context';
import { AuthGuard } from '../identity/auth.guard';
import { AlbumsService } from './albums.service';

const AlbumSchema = z.object({
  title: z.string().trim().min(1).max(120),
});

const ItemSchema = z.object({
  mediaId: z.string().uuid(),
  caption: z.string().trim().max(500).default(''),
});

@Controller('albums')
@UseGuards(AuthGuard)
export class AlbumsController {
  constructor(private readonly albums: AlbumsService) {}

  @Get()
  list(@CurrentAuth() auth: AuthContext) {
    return this.albums.list(auth.userId);
  }

  @Post()
  create(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    return this.albums.create(auth.userId, parseBody(AlbumSchema, body).title);
  }

  @Post(':id/items')
  addItem(@CurrentAuth() auth: AuthContext, @Param('id') id: string, @Body() body: unknown) {
    const input = parseBody(ItemSchema, body);
    return this.albums.addItem(auth.userId, id, input.mediaId, input.caption ?? '');
  }
}
