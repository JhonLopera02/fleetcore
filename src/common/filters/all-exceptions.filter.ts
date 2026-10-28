import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

/**
 * Exception Filter GLOBAL: toda excepción sale con el mismo formato
 * { success:false, statusCode, message, path, timestamp }.
 * Los errores de PostgreSQL (unicidad, FK...) se traducen a 4xx para que
 * nunca lleguen al cliente como un 500.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const { statusCode, message, errors } = this.normalize(exception);

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      ...(errors ? { errors } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private normalize(exception: unknown): {
    statusCode: number;
    message: string;
    errors?: string[];
  } {
    // Errores HTTP de Nest (validación, 401, 403, 404, 409...)
    if (exception instanceof HttpException) {
      const body = exception.getResponse() as any;
      const raw = typeof body === 'string' ? body : body?.message;
      if (Array.isArray(raw)) {
        return {
          statusCode: exception.getStatus(),
          message: 'Error de validación',
          errors: raw,
        };
      }
      return { statusCode: exception.getStatus(), message: raw ?? exception.message };
    }

    // Errores de base de datos (driver pg)
    if (exception instanceof QueryFailedError) {
      const driver: any = (exception as any).driverError ?? {};
      switch (driver.code) {
        case '23505':
          return {
            statusCode: HttpStatus.CONFLICT,
            message: `Ya existe un registro con ese valor único. ${driver.detail ?? ''}`.trim(),
          };
        case '23503':
          return {
            statusCode: HttpStatus.CONFLICT,
            message: `La operación viola una relación entre registros. ${driver.detail ?? ''}`.trim(),
          };
        case '23502':
        case '22P02':
        case '22007':
        case '22003':
          return {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Datos inválidos para la base de datos',
          };
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error interno del servidor',
    };
  }
}
