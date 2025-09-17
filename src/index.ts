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
  HttpRequest,
  HttpResponse,
  HttpContext,
  AuthUser,
  AuthRequest,
  AuthType,
  AuthStrategy,
  AuthConfig,
  RoleConfig,
  SessionConfig,
  
  // Common components
  IO,
  Middleware,
  MiddlewareFunction,
  MiddlewareRegistry,
  MiddlewareTools,
  Result,
  Failure,
  ConsoleLogger,
  
  // HTTP App components
  HttpApp,
  BaseHttpApp,
  HttpPlugin,
  PluginManager,
  Router,
  
  // Dependency Injection
  DIContainer,
  Injectable,
  Inject,
  
  // Validation
  ValidationMiddleware,
  ValidationResult
} from '@soapjs/soap';
