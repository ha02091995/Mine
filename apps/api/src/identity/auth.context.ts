import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthContext {
  userId: string;
  sessionId: string;
  destination: string;
  displayName: string;
}

export const CurrentAuth = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext => {
    return ctx.switchToHttp().getRequest().auth;
  },
);
