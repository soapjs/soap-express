import { RouteMetadata, MiddlewareMetadata } from '@soapjs/soap';
import { RouteErrorHandler, RouteHandler } from './types';

export class SoapRouter {
  private routes: RouteMetadata[] = [];
  private middlewares: MiddlewareMetadata[] = [];
  private currentRoute: RouteMetadata | null = null;
  private errorHandler?: RouteErrorHandler;

  constructor(private basePath: string = '') {}

  // Route methods
  get(path: string, handler: RouteHandler) {
    this.addRoute('GET', path, handler);
    return this;
  }

  post(path: string, handler: RouteHandler) {
    this.addRoute('POST', path, handler);
    return this;
  }

  put(path: string, handler: RouteHandler) {
    this.addRoute('PUT', path, handler);
    return this;
  }

  delete(path: string, handler: RouteHandler) {
    this.addRoute('DELETE', path, handler);
    return this;
  }

  patch(path: string, handler: RouteHandler) {
    this.addRoute('PATCH', path, handler);
    return this;
  }

  // Middleware methods
  use(middleware: any) {
    this.middlewares.push({
      type: 'custom',
      options: {},
      middleware,
      order: this.middlewares.length
    });
    return this;
  }

  cors(options: any) {
    this.middlewares.push({
      type: 'cors',
      options,
      order: this.middlewares.length
    });
    return this;
  }

  rateLimit(options: any) {
    this.middlewares.push({
      type: 'rateLimit',
      options,
      order: this.middlewares.length
    });
    return this;
  }

  auth(options: any) {
    this.middlewares.push({
      type: 'authentication',
      options,
      order: this.middlewares.length
    });
    return this;
  }

  authorize(options: any) {
    this.middlewares.push({
      type: 'authorization',
      options,
      order: this.middlewares.length
    });
    return this;
  }

  validate(schema: any) {
    this.middlewares.push({
      type: 'validation',
      options: { schema },
      order: this.middlewares.length
    });
    return this;
  }

  logging(options: any) {
    this.middlewares.push({
      type: 'logging',
      options,
      order: this.middlewares.length
    });
    return this;
  }

  cache(options: any) {
    this.middlewares.push({
      type: 'cache',
      options,
      order: this.middlewares.length
    });
    return this;
  }

  // UseCase integration
  useCase(useCaseClass: any) {
    if (this.currentRoute) {
      this.currentRoute.useCase = useCaseClass;
    }
    return this;
  }

  // RouteIO integration
  routeIO(routeIO: any) {
    if (this.currentRoute) {
      this.currentRoute.routeIO = routeIO;
    }
    return this;
  }

  // Error handler integration (deprecated - use setErrorHandler instead)
  setRouteErrorHandler(errorHandler: RouteErrorHandler) {
    // This method is deprecated - error handlers should be set at router level
    console.warn('setRouteErrorHandler() method is deprecated. Use setErrorHandler() to set router-level error handler.');
    return this;
  }

  // Set router-level error handler
  setErrorHandler(errorHandler: RouteErrorHandler) {
    this.errorHandler = errorHandler;
    return this;
  }

  // Get router-level error handler
  getErrorHandler(): RouteErrorHandler | undefined {
    return this.errorHandler;
  }

  private addRoute(method: string, path: string, handler: RouteHandler) {
    const fullPath = `${this.basePath}${path}`;
    const route: RouteMetadata = {
      method: method as any,
      path: fullPath,
      handler,
      middlewares: [...this.middlewares]
    };
    
    this.routes.push(route);
    this.currentRoute = route;
  }

  // Get all routes
  getRoutes(): RouteMetadata[] {
    return this.routes;
  }

  // Get base path
  getBasePath(): string {
    return this.basePath;
  }

  // Clear routes (for testing)
  clear() {
    this.routes = [];
    this.middlewares = [];
    this.currentRoute = null;
  }
}
