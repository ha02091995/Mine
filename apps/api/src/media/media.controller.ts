import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { z } from 'zod';
import { parseBody } from '../common/http';
import { AuthContext, CurrentAuth } from '../identity/auth.context';
import { AuthGuard } from '../identity/auth.guard';
import { MediaService } from './media.service';

const UploadSchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('uploads')
  @UseGuards(AuthGuard)
  create(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    return this.media.createUpload(auth.userId, parseBody(UploadSchema, body).contentType);
  }

  @Put(':id/content')
  async save(
    @Param('id') id: string,
    @Query('expires') expires: string,
    @Query('sig') sig: string,
    @Req() req: Request,
  ) {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    const contentType = typeof req.headers['content-type'] === 'string' ? req.headers['content-type'] : undefined;
    return this.media.save(id, expires, sig, Buffer.concat(chunks), contentType);
  }

  @Get(':id/content')
  async read(
    @Param('id') id: string,
    @Query('expires') expires: string,
    @Query('sig') sig: string,
    @Res() res: Response,
  ) {
    const file = await this.media.read(id, expires, sig);
    res.setHeader('Content-Type', file.contentType);
    res.send(file.bytes);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@CurrentAuth() auth: AuthContext, @Param('id') id: string) {
    return this.media.remove(auth.userId, id);
  }
}
