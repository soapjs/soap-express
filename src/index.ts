// Main exports for @soapjs/soap-express
// Import domain/core primitives directly from @soapjs/soap.
// This entry point covers HTTP concerns only; CQRS decorators live in @soapjs/soap-express/cqrs.
export { SoapExpressApp } from './app';
export { createApp, bootstrap } from './bootstrap';
export type { BootstrapConfig } from './bootstrap';
export { HttpFailure } from './http-failure';
export { ResultMapper } from './result-mapper';
export type { ResultMapOptions } from './result-mapper';
export { ExpressRouter } from './infra/http/router';
export { PaginationIO, FileUploadIO, SimpleIO } from './route-io';

// Decorators (HTTP + auth; CQRS excluded — see /cqrs entry)
export * from './decorators';

// Middlewares + validation adapters
export * from './middlewares';

// Error Handling
export { ErrorHandler } from './error-handling/error-handler';

// Types
export * from './types';

// Utils
export * from './utils';

// ── Convenience re-exports from @soapjs/soap (HTTP-only slice) ───────────────
// These are the types developers most commonly reach for when building an HTTP
// service. Importing them here does NOT add memory overhead — they are already
// loaded by this package's own code through the deep-path imports above.
export {
  // Route builders
  Route,
  GetRoute,
  PostRoute,
  PutRoute,
  PatchRoute,
  DeleteRoute,
  HeadRoute,
  OptionsRoute,
  TraceRoute,
  ConnectRoute,
  AllRoute,
  RouteGroup,
  RouteRegistry,

  // HTTP app base
  BaseHttpApp,
  HttpPlugin,
  Router,

  // Auth types (runtime)
  AuthType,

  // Middleware
  MiddlewareType,

  // Error classes — throw these from controllers/handlers
  HttpError,
  UnsupportedHttpMethodError,
  InvalidRoutePathError,
  NotImplementedError,

  // Built-in plugins
  HealthCheckPlugin,
  PingPlugin,
  MetricsPlugin,
} from '@soapjs/soap/http';

export type {
  // Auth interfaces — used to type req.user and auth strategies
  AuthUser,
  AuthRequest,
  AuthStrategy,
  AuthConfig,
  RoleConfig,
  SessionConfig,

  // Framework-agnostic request/response types
  HttpRequest,
  HttpResponse,
  HttpContext,
  HttpApp,

  // Route-building types
  RequestMethod,
  RouteAdditionalOptions,
  AnyHandler,
  HandlerResult,

  // Plugin extension interfaces
  PluginManager,

  // Validation
  ValidationMiddleware,
  ValidationResult,
} from '@soapjs/soap/http';

export {
  // Common utilities always needed in a service
  Result,
  Failure,
  ConsoleLogger,
  DIContainer,
  Injectable,
  Inject,

  // DI helpers — use these for global container access
  DI,
  container,
} from '@soapjs/soap/common';

export {
  // Middleware primitives
  IO,
  Middleware,
  MiddlewareRegistry,
  MiddlewareTools,
} from '@soapjs/soap/middleware';

export type {
  // Middleware function signature
  MiddlewareFunction,
} from '@soapjs/soap/middleware';
