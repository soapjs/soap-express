import { Request, Response, NextFunction } from 'express';
import { Result } from '@soapjs/soap';

export interface ErrorHandlerOptions {
  logger?: (error: Error, req: Request, res: Response) => void;
  sentry?: (error: Error, req: Request, res: Response) => void;
  custom?: (error: Error, req: Request, res: Response) => void;
  includeStack?: boolean;
  includeRequest?: boolean;
}

export interface RouteErrorHandler {
  handler: (error: Error, req: Request, res: Response) => void;
  options?: ErrorHandlerOptions;
}

export class ErrorHandler {
  private defaultHandler: (error: Error, req: Request, res: Response) => void;
  private appErrorHandler?: (error: Error, req: Request, res: Response) => void;
  private appOptions?: ErrorHandlerOptions;

  constructor(
    appErrorHandler?: (error: Error, req: Request, res: Response) => void,
    appOptions?: ErrorHandlerOptions
  ) {
    this.appErrorHandler = appErrorHandler;
    this.appOptions = appOptions;
    this.defaultHandler = this.createDefaultHandler();
  }

  handle(error: Error, req: Request, res: Response, routeErrorHandler?: RouteErrorHandler) {
    // 1. Route-level error handler (highest priority)
    if (routeErrorHandler) {
      return routeErrorHandler.handler(error, req, res);
    }

    // 2. App-level error handler
    if (this.appErrorHandler) {
      return this.appErrorHandler(error, req, res);
    }

    // 3. Default error handler
    return this.defaultHandler(error, req, res);
  }

  private createDefaultHandler(): (error: Error, req: Request, res: Response) => void {
    return (error: Error, req: Request, res: Response) => {
      // Log error
      this.logError(error, req, res);

      // Send response
      if (res.headersSent) {
        return;
      }

      const statusCode = this.getStatusCode(error);
      const message = this.getErrorMessage(error);

      res.status(statusCode).json({
        error: message,
        message: error.message || 'An error occurred',
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
        ...(this.appOptions?.includeStack && { stack: error.stack }),
        ...(this.appOptions?.includeRequest && {
          request: {
            body: req.body,
            query: req.query,
            params: req.params,
            headers: this.sanitizeHeaders(req.headers)
          }
        })
      });
    };
  }

  private logError(error: Error, req: Request, res: Response) {
    const logData = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      request: {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      }
    };

    // Console logging
    console.error('SoapJS Express Error:', logData);

    // Custom logger
    if (this.appOptions?.logger) {
      this.appOptions.logger(error, req, res);
    }

    // Sentry integration
    if (this.appOptions?.sentry) {
      this.appOptions.sentry(error, req, res);
    }

    // Custom error handler
    if (this.appOptions?.custom) {
      this.appOptions.custom(error, req, res);
    }
  }

  private getStatusCode(error: Error): number {
    // Check for custom status code
    if ((error as any).statusCode) {
      return (error as any).statusCode;
    }

    // Map error types to HTTP status codes
    if (error.name === 'ValidationError') {
      return 400;
    }

    if (error.name === 'UnauthorizedError') {
      return 401;
    }

    if (error.name === 'ForbiddenError') {
      return 403;
    }

    if (error.name === 'NotFoundError') {
      return 404;
    }

    if (error.name === 'ConflictError') {
      return 409;
    }

    if (error.name === 'RateLimitError') {
      return 429;
    }

    return 500;
  }

  private getErrorMessage(error: Error): string {
    const statusCode = this.getStatusCode(error);
    
    // Return standard HTTP error messages
    switch (statusCode) {
      case 400:
        return 'Bad Request';
      case 401:
        return 'Unauthorized';
      case 403:
        return 'Forbidden';
      case 404:
        return 'Not Found';
      case 409:
        return 'Conflict';
      case 422:
        return 'Unprocessable Entity';
      case 429:
        return 'Too Many Requests';
      case 500:
        return 'Internal server error';
      case 501:
        return 'Not Implemented';
      case 502:
        return 'Bad Gateway';
      case 503:
        return 'Service Unavailable';
      case 504:
        return 'Gateway Timeout';
      case 418:
        return 'I\'m a teapot';
      default:
        return 'Internal server error';
    }

    // Default messages for common error types
    if (error.name === 'ValidationError') {
      return 'Validation failed';
    }

    if (error.name === 'UnauthorizedError') {
      return 'Unauthorized';
    }

    if (error.name === 'ForbiddenError') {
      return 'Forbidden';
    }

    if (error.name === 'NotFoundError') {
      return 'Not found';
    }

    if (error.name === 'ConflictError') {
      return 'Conflict';
    }

    if (error.name === 'RateLimitError') {
      return 'Too many requests';
    }

    return 'Internal server error';
  }

  private sanitizeHeaders(headers: any): any {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    const sanitized = { ...headers };

    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}

// Predefined error handlers
export class SentryErrorHandler {
  static create(sentryClient: any): RouteErrorHandler {
    return {
      handler: (error: Error, req: Request, res: Response) => {
        // Capture error with Sentry
        sentryClient.captureException(error, {
          tags: {
            component: 'express',
            method: req.method,
            path: req.path
          },
          extra: {
            request: {
              method: req.method,
              path: req.path,
              query: req.query,
              body: req.body
            }
          }
        });

        // Send response
        res.status(500).json({
          error: 'Internal server error',
          timestamp: new Date().toISOString()
        });
      }
    };
  }
}

export class LoggerErrorHandler {
  static create(logger: any): RouteErrorHandler {
    return {
      handler: (error: Error, req: Request, res: Response) => {
        // Log error
        logger.error('Express Error', {
          error: error.message,
          stack: error.stack,
          request: {
            method: req.method,
            path: req.path,
            ip: req.ip
          }
        });

        // Send response
        res.status(500).json({
          error: 'Internal server error',
          timestamp: new Date().toISOString()
        });
      }
    };
  }
}

export class CustomErrorHandler {
  static create(handler: (error: Error, req: Request, res: Response) => void): RouteErrorHandler {
    return {
      handler
    };
  }
}