import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from 'express';

export interface AuthenticatedRequest extends Request {
 user: any
}
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('API Gateway');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<AuthenticatedRequest>();
    const response = httpContext.getResponse<Response>();

    // Generate or extract correlationId
    const correlationId = request.headers['x-correlation-id']?.toString() || uuidv4();
    request.headers['x-correlation-id'] = correlationId;

    // Extract request details
    const { method, path, body, headers } = request;
    const userId = request.user?.sub || 'anonymous';
    const userAgent = headers['user-agent'] || 'unknown';

    // Log incoming request
    this.logger.log({
      level: 'info',
      message: 'Incoming request',
      correlationId,
      userId,
      method,
      path,
      body: this.sanitizeBody(body),
      userAgent,
      timestamp: new Date().toISOString(),
    });

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const responseTime = Date.now() - startTime;
          // Log response
          this.logger.log({
            level: 'info',
            message: 'Request completed',
            correlationId,
            userId,
            method,
            path,
            statusCode: response.statusCode,
            responseTime,
            timestamp: new Date().toISOString(),
          });
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;
          // Log error
          this.logger.error({
            level: 'error',
            message: 'Request failed',
            correlationId,
            userId,
            method,
            path,
            statusCode: response.statusCode || 500,
            responseTime,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
          });
        },
      }),
    );
  }

  // Sanitize sensitive data in request body (e.g., passwords)
  private sanitizeBody(body: any): any {
    if (!body) return body;
    const sanitized = { ...body };
    if (sanitized.password) sanitized.password = '[REDACTED]';
    if (sanitized.token) sanitized.token = '[REDACTED]';
    return sanitized;
  }
}