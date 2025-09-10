import { Request, Response, NextFunction } from 'express';
import { RequestMethod, DIContainer, IO, RouteAdditionalOptions } from '@soapjs/soap';

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
}

export interface RouteMetadata {
  method: RequestMethod;
  path: string;
  middlewares: MiddlewareMetadata[];
  useCase?: any;
  routeIO?: ExpressIO;
  handler?: RouteHandler;
  errorHandler?: RouteErrorHandler;
  options?: RouteAdditionalOptions;
}

export interface MiddlewareMetadata {
  type: string;
  options: any;
  order: number;
  middleware?: any;
}

export interface ControllerMetadata {
  basePath: string;
  middlewares: MiddlewareMetadata[];
  type?: 'http';
}

export type RouteHandler = (req: Request, res: Response) => Promise<any> | any;

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
