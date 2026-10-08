import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: Number(config.get('JWT_ACCESS_TTL') ?? 900) },
      }),
    }),
  ],
  controllers: [IdentityController],
  providers: [IdentityService, AuthGuard],
  exports: [IdentityService, AuthGuard, JwtModule],
})
export class IdentityModule {}
