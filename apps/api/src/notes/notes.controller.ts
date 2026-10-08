import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { parseBody } from '../common/http';
import { AuthContext, CurrentAuth } from '../identity/auth.context';
import { AuthGuard } from '../identity/auth.guard';
import { NotesService } from './notes.service';

const NoteSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

@Controller('notes')
@UseGuards(AuthGuard)
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  list(@CurrentAuth() auth: AuthContext) {
    return this.notes.list(auth.userId);
  }

  @Post()
  create(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    return this.notes.create(auth.userId, parseBody(NoteSchema, body).body);
  }

  @Patch(':id')
  update(@CurrentAuth() auth: AuthContext, @Param('id') id: string, @Body() body: unknown) {
    return this.notes.update(auth.userId, id, parseBody(NoteSchema, body).body);
  }
}
