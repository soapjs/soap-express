import { Request, Response, NextFunction } from 'express';
import { Result, Logger, ConsoleLogger } from '@soapjs/soap/common';

/**
 * Options for the framework error handler. Backwards-compatible: the legacy
 * `logger` function still works; new code should use the `port` field to pass
 * a {@link Logger} instance — the same one the rest of the app uses.
 */
export interface ErrorHandlerOptions {
  /**
   * Legacy hook: called once per error with the raw `(error, req, res)`.
   * Kept for backwards compatibility with apps that wired Sentry or Winston
   * here before the Logger port existed. Prefer {@link ErrorHandlerOptions.port}
   * for new code.
   */
  logger?: (error: Error, req: Request, res: Response) => void;
  /**
   * Logger port. When supplied, the handler emits a structured `error`
   * record per failure (with the same correlation id `req.log` uses, when
   * available) instead of writing to `console.error`. Bootstrap auto-fills
   * this from DI so all framework layers share one logger.
   */
  port?: Logger;
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
    // Prefer the per-request child logger (carries requestId + method/path)
    // attached by LoggingMiddleware. Fall back to the configured logger port,
    // then to a fresh ConsoleLogger so the error is never swallowed even
    // when no logger has been wired explicitly.
    const requestLogger: Logger | undefined = (req as Request & { log?: Logger }).log;
    const portLogger: Logger | undefined = this.appOptions?.port;
    const logger: Logger = requestLogger ?? portLogger ?? new ConsoleLogger();

    logger.error('Unhandled error', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Backwards-compat hook for apps that wired logging via the function form.
    if (this.appOptions?.logger) {
      this.appOptions.logger(error, req, res);
    }

    if (this.appOptions?.sentry) {
      this.appOptions.sentry(error, req, res);
    }

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