import { Request, Response, NextFunction } from 'express';
import { RequestMethod, RouteAdditionalOptions, HttpPlugin } from '@soapjs/soap/http';
import { IO } from '@soapjs/soap/middleware';
import { DIContainer, Logger } from '@soapjs/soap/common';

// Express-specific IO interface that maps to @soapjs/soap IO
export interface ExpressIO<I = unknown, O = unknown> extends IO<I, O> {
  from: <T = Request>(source: T) => I;
  to: <T = Response>(result: O, target: T) => void;
}

// File upload types
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer?: Buffer;
}

// Extended Request type with file support
export interface RequestWithFile extends Request {
  file?: UploadedFile;
  files?: UploadedFile[] | { [fieldname: string]: UploadedFile[] };
}

// Core types
export interface SoapExpressOptions {
  container?: DIContainer;
  /**
   * Logger port used by the framework's HTTP layer (logging middleware,
   * error handler) and bound in the container under `Logger.Token` so every
   * resolved service can read the same instance. Defaults to a level-aware
   * {@link ConsoleLogger} that emits JSON when stdout is not a TTY.
   */
  logger?: Logger;
  middlewares?: any[];
  errorHandler?: (error: any, req: Request, res: Response, next: NextFunction) => void;
  errorHandlerOptions?: ErrorHandlerOptions;
  cors?: any;
  rateLimit?: any;
  logging?: any;
  metrics?: any;
  memoryMonitoring?: any;
  security?: SecurityOptions;
}

export type RouteHandler = (req: Request, res: Response) => Promise<any> | any;

// Middleware types
export interface AuthOptions {
  required: boolean;
  roles?: string[];
  secret?: string;
  /**
   * Verifies a bearer token and resolves to the authenticated user, or a
   * falsy value if the token is invalid. Required when `required` is true —
   * there is no built-in/default verifier (the middleware fails closed).
   */
  verify?: (token: string, secret?: string) => any | Promise<any>;
}

export interface ValidationOptions {
  schema: any;
}

export interface CorsOptions {
  origin: string | string[];
  credentials?: boolean;
  methods?: string[];
  allowedHeaders?: string[];
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string | object;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}

export type ThrottleKeyBy = 'ip' | 'user' | 'apiKey' | ((req: Request) => string);

export interface ThrottleRule {
  windowMs: number;
  max: number;
  message?: string | object;
  keyBy?: ThrottleKeyBy;
  skip?: (req: Request) => boolean;
}

export interface ThrottleOptions extends ThrottleRule {}

export interface SecurityThrottleOptions {
  global?: ThrottleRule | boolean;
  routes?: Record<string, ThrottleRule>;
  groups?: Record<string, ThrottleRule>;
}

export interface SecurityOptions {
  /**
   * Disable the default `X-Powered-By: Express` header. Defaults to true.
   */
  disablePoweredBy?: boolean;
  /**
   * Passed to `app.set('trust proxy', value)` when defined.
   */
  trustProxy?: boolean | string | number | string[];
  /**
   * Enables helmet. `true` uses helmet defaults.
   */
  helmet?: boolean | Record<string, unknown>;
  /**
   * Enables CORS. `true` uses cors defaults.
   */
  cors?: boolean | CorsOptions | Record<string, unknown>;
  /**
   * Global/path-aware throttling powered by express-rate-limit.
   */
  throttle?: SecurityThrottleOptions | ThrottleRule | boolean;
}

export interface LoggingOptions {
  level: 'debug' | 'info' | 'warn' | 'error';
  format?: string;
}

export interface CacheOptions {
  ttl: number;
  key?: string;
  keyGenerator?: (req: Request) => string;
}

// Error handling types
export interface ErrorHandlerOptions {
  /**
   * Legacy hook called with `(error, req, res)`. Kept for backwards
   * compatibility — prefer `port` for new code.
   */
  logger?: (error: Error, req: Request, res: Response) => void;
  /**
   * Logger port. Bootstrap auto-fills this with the framework logger so the
   * error handler emits structured records through the same sink as the
   * rest of the app.
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
