import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message = 'Error interno del servidor';
    let code = 'INTERNAL_ERROR';

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const resp = exceptionResponse as any;
      message = Array.isArray(resp.message) ? resp.message.join(', ') : resp.message || message;
      code = resp.error || code;
    }

    if (status === HttpStatus.FORBIDDEN) {
      code = 'INSUFFICIENT_PERMISSIONS';
      if (!message || message === 'Forbidden resource') {
        message = 'No tienes permisos suficientes para realizar esta acción.';
      }
    } else if (status === HttpStatus.UNAUTHORIZED) {
      code = 'UNAUTHORIZED';
    }

    response.status(status).json({
      statusCode: status,
      code,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
