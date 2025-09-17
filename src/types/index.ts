import { Request, Response, NextFunction } from 'express';
import { RequestMethod, DIContainer, IO, RouteAdditionalOptions, HttpApp, HttpPlugin } from '@soapjs/soap';

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
  middlewares?: any[];
  errorHandler?: (error: any, req: Request, res: Response, next: NextFunction) => void;
  errorHandlerOptions?: ErrorHandlerOptions;
  cors?: any;
  rateLimit?: any;
  logging?: any;
  metrics?: any;
  memoryMonitoring?: any;
  security?: any;
}

export type RouteHandler = (req: Request, res: Response) => Promise<any> | any;

// Middleware types
export interface AuthOptions {
  required: boolean;
  roles?: string[];
  secret?: string;
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
