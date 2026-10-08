import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthContext, CurrentAuth } from '../identity/auth.context';
import { AuthGuard } from '../identity/auth.guard';
import { AccountService } from './account.service';

@Controller()
@UseGuards(AuthGuard)
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Get('stickers')
  stickers(@CurrentAuth() auth: AuthContext) {
    return this.account.stickers(auth.userId);
  }

  @Post('sticker-packs/:packId')
  claim(@CurrentAuth() auth: AuthContext, @Param('packId') packId: string) {
    return this.account.claimPack(auth.userId, packId);
  }

  @Get('me/export')
  export(@CurrentAuth() auth: AuthContext) {
    return this.account.export(auth.userId);
  }

  @Post('me/deletion')
  deleteAccount(@CurrentAuth() auth: AuthContext) {
    return this.account.deleteAccount(auth.userId);
  }
}
