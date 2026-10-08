import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { ZodType } from 'zod';

export class ApiException extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    if (exception instanceof ApiException) {
      response.status(exception.status).json({
        code: exception.code,
        message: exception.message,
        details: exception.details,
      });
      return;
    }
    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json({
        code: 'HTTP_ERROR',
        message: exception.message,
        details: {},
      });
      return;
    }
    console.error(exception);
    response.status(500).json({
      code: 'INTERNAL',
      message: 'Internal error',
      details: {},
    });
  }
}

export function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ApiException(400, 'VALIDATION_ERROR', 'Invalid request', {
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }
  return result.data;
}
