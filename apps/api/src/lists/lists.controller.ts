import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { parseBody } from '../common/http';
import { AuthContext, CurrentAuth } from '../identity/auth.context';
import { AuthGuard } from '../identity/auth.guard';
import { ListsService } from './lists.service';

const CitySchema = z.object({
  city: z.string().trim().min(1).max(80),
});

const ListSchema = z.object({
  title: z.string().trim().min(1).max(120),
});

const ItemSchema = z.object({
  body: z.string().trim().min(1).max(500),
});

const DoneSchema = z.object({
  done: z.boolean(),
});

const SaveSchema = z.object({
  placeId: z.string().uuid(),
});

@Controller()
@UseGuards(AuthGuard)
export class ListsController {
  constructor(private readonly lists: ListsService) {}

  @Get('me')
  me(@CurrentAuth() auth: AuthContext) {
    return this.lists.profile(auth.userId);
  }

  @Patch('me')
  setCity(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    return this.lists.setCity(auth.userId, parseBody(CitySchema, body).city);
  }

  @Get('lists')
  list(@CurrentAuth() auth: AuthContext) {
    return this.lists.list(auth.userId);
  }

  @Post('lists')
  create(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    return this.lists.create(auth.userId, parseBody(ListSchema, body).title);
  }

  @Post('lists/:id/items')
  addItem(@CurrentAuth() auth: AuthContext, @Param('id') id: string, @Body() body: unknown) {
    return this.lists.addItem(auth.userId, id, parseBody(ItemSchema, body).body);
  }

  @Patch('lists/:id/items/:itemId')
  setDone(
    @CurrentAuth() auth: AuthContext,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: unknown,
  ) {
    return this.lists.setDone(auth.userId, id, itemId, parseBody(DoneSchema, body).done);
  }

  @Get('discover')
  discover(@CurrentAuth() auth: AuthContext) {
    return this.lists.discover(auth.userId);
  }

  @Get('saved-items')
  saved(@CurrentAuth() auth: AuthContext) {
    return this.lists.saved(auth.userId);
  }

  @Post('saved-items')
  save(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    return this.lists.savePlace(auth.userId, parseBody(SaveSchema, body).placeId);
  }
}
