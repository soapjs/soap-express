// Main exports for @soapjs/soap-express
export { SoapExpressApp } from './app';
export { SoapRouter } from './router';
export { PaginationIO, FileUploadIO, SimpleIO } from './route-io';

// Decorators
export * from './decorators';

// Middlewares
export * from './middlewares';

// Error Handling
export { ErrorHandler } from './error-handling/error-handler';

// Types
export * from './types';

// Utils
export * from './utils';

// Auth
export type { AuthUser, AuthRequest, AuthConfig, RoleConfig, AuthStrategy, SessionConfig } from './auth';
export { AuthType, AuthRegistry, AuthMiddlewareFactory } from './auth';

// Metrics
export * from './metrics';

// Monitoring
export * from './monitoring';

// Security
export * from './security';

// Plugins
export * from './plugins';

// Re-export @soapjs/soap infra/http and common components
export {
  // Route system
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
  
  // Types
  RequestMethod,
  RouteConfig,
  RouteAdditionalOptions,
  RouteCorsOptions,
  RouteSecurityOptions,
  RouteRateLimitOptions,
  RouteValidationOptions,
  RouteCompressionOptions,
  ValidationOptions,
  MiddlewareType,
  AnyHandler,
  HandlerResult,
  
  // Common components
  IO,
  Middleware,
  MiddlewareFunction,
  MiddlewareRegistry,
  MiddlewareTools,
  
  // Validation
  ValidationMiddleware,
  ValidationResult,
  
  // Dependency Injection namespace
  DI
} from '@soapjs/soap';
