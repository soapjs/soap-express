import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { Logger, ConsoleLogger } from '@soapjs/soap/common';
import { LoggingOptions } from '../types';

/**
 * Per-request fields the middleware attaches to `req` so downstream code can
 * pick up the framework-managed logger and request id without re-parsing
 * headers or generating ids of its own.
 */
declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
    log?: Logger;
  }
}

const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Options accepted by {@link LoggingMiddleware.create}. Both the public
 * `LoggingOptions` (from bootstrap config) and an internal-only `logger`
 * field are accepted; bootstrap supplies the Logger from DI so the same
 * instance is used by middleware, error handler, and downstream layers.
 */
export interface LoggingMiddlewareOptions extends LoggingOptions {
  /**
   * Logger the middleware uses to emit access logs and attaches to every
   * request as `req.log` (with `requestId`/`method`/`path` context). Falls
   * back to a {@link ConsoleLogger} for backwards compatibility.
   */
  logger?: Logger;
  /**
   * Body of "log this kind of request" gate. Useful for skipping noisy
   * paths like `/health` from the access log. Defaults to logging
   * everything.
   */
  skip?: (req: Request) => boolean;
}

export class LoggingMiddleware {
  /**
   * Creates an Express middleware that:
   *
   * 1. Assigns or echoes back an `X-Request-Id` (UUID v4 by default).
   * 2. Builds a child {@link Logger} bound to `{ requestId, method, path }`
   *    and attaches it as `req.log` — downstream handlers, controllers, and
   *    the framework's error handler can log against the same correlation
   *    id without threading it through every call site.
   * 3. Emits a structured `info` record when the response finishes, with
   *    status code and elapsed milliseconds.
   *
   * Replaces the previous implementation that wrote raw `console.log` lines
   * — the framework now has a Logger port, and "production-ready" projects
   * cannot ship their own request logs through `console.log`.
   */
  static create(options: LoggingMiddlewareOptions) {
    const logger = options.logger ?? new ConsoleLogger({ level: options.level });
    const skip = options.skip;

    return (req: Request, res: Response, next: NextFunction) => {
      if (skip?.(req)) {
        next();
        return;
      }

      const incoming = typeof req.header === 'function' ? req.header(REQUEST_ID_HEADER) : undefined;
      const traceId = (req as Request & { traceId?: string }).traceId;
      const requestId =
        incoming && incoming.trim().length > 0 ? incoming.trim() : traceId ?? randomUUID();
      req.requestId = requestId;
      res.setHeader(REQUEST_ID_HEADER, requestId);

      const childLogger = logger.child
        ? logger.child({
            requestId,
            traceId: traceId ?? requestId,
            method: req.method,
            path: req.path,
          })
        : logger;
      req.log = childLogger;

      const start = process.hrtime.bigint();

      childLogger.http(`${req.method} ${req.path}`, {
        ip: req.ip,
      });

      const originalEnd = res.end.bind(res);
      // The Express typings overload `res.end` in three shapes; the runtime
      // signature is consistent. We forward the original arguments untouched.
      res.end = function (
        this: Response,
        ...args: unknown[]
      ): Response {
        const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
        const level: 'error' | 'warn' | 'http' =
          res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'http';
        childLogger[level](`${req.method} ${req.path} → ${res.statusCode}`, {
          status: res.statusCode,
          durationMs: Math.round(durationMs * 100) / 100,
        });
        return (originalEnd as (...rest: unknown[]) => Response)(...args);
      } as Response['end'];

      next();
    };
  }

  /**
   * Verbose variant: also logs request bodies, headers, query, and response
   * size. Use only on dev environments — request bodies are likely to
   * contain PII and headers contain auth tokens.
   */
  static createDetailed(options: Partial<LoggingMiddlewareOptions> = {}) {
    const logger = options.logger ?? new ConsoleLogger({ level: options.level });

    return (req: Request, res: Response, next: NextFunction) => {
      const incoming = typeof req.header === 'function' ? req.header(REQUEST_ID_HEADER) : undefined;
      const requestId = incoming && incoming.trim().length > 0 ? incoming.trim() : randomUUID();
      req.requestId = requestId;
      res.setHeader(REQUEST_ID_HEADER, requestId);

      const childLogger = logger.child
        ? logger.child({ requestId, method: req.method, path: req.path })
        : logger;
      req.log = childLogger;

      const start = process.hrtime.bigint();

      childLogger.debug('Incoming request', {
        method: req.method,
        path: req.path,
        query: req.query,
        body: req.body,
        headers: req.headers,
        ip: req.ip,
      });

      const originalEnd = res.end.bind(res);
      res.end = function (this: Response, ...args: unknown[]): Response {
        const chunk = args[0] as { length?: number } | undefined;
        const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
        childLogger.debug('Outgoing response', {
          status: res.statusCode,
          durationMs: Math.round(durationMs * 100) / 100,
          responseSize: chunk && typeof chunk.length === 'number' ? chunk.length : 0,
        });
        return (originalEnd as (...rest: unknown[]) => Response)(...args);
      } as Response['end'];

      next();
    };
  }
}
