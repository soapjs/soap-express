import { Express, Request, Response, NextFunction } from 'express';
import { Route, Router, RouteMetadata, MiddlewareMetadata } from '@soapjs/soap/http';
import { RouteErrorHandler, RouteHandler } from '../../types';
import { MiddlewareFactory } from '../../utils/middleware-factory';
import { dispatchResult, resolveUseCase } from '../../utils/route-dispatch';

export class ExpressRouter {
  readonly prefix?: string;
  readonly apiVersion?: string;
  private routes: RouteMetadata[] = [];
  private middlewares: MiddlewareMetadata[] = [];
  private currentRoute: RouteMetadata | null = null;
  private initialized: boolean = false;
  private errorHandler?: RouteErrorHandler;
  private middlewareFactory = new MiddlewareFactory();

  constructor(prefix?: string, apiVersion?: string) {
    this.prefix = prefix;
    this.apiVersion = apiVersion;
  }

  // HTTP method shortcuts
  get(path: string, handler: RouteHandler): this {
    this.addRoute('GET', path, handler);
    return this;
  }

  post(path: string, handler: RouteHandler): this {
    this.addRoute('POST', path, handler);
    return this;
  }

  put(path: string, handler: RouteHandler): this {
    this.addRoute('PUT', path, handler);
    return this;
  }

  delete(path: string, handler: RouteHandler): this {
    this.addRoute('DELETE', path, handler);
    return this;
  }

  patch(path: string, handler: RouteHandler): this {
    this.addRoute('PATCH', path, handler);
    return this;
  }

  // Middleware methods
  use(middleware: any): this {
    this.addMiddleware({
      type: 'custom',
      options: {},
      middleware,
      order: this.getCurrentMiddlewareOrder()
    });
    return this;
  }

  cors(options: any): this {
    this.addMiddleware({
      type: 'cors',
      options,
      order: this.getCurrentMiddlewareOrder()
    });
    return this;
  }

  rateLimit(options: any): this {
    this.addMiddleware({
      type: 'rateLimit',
      options,
      order: this.getCurrentMiddlewareOrder()
    });
    return this;
  }

  auth(options: any): this {
    this.addMiddleware({
      type: 'authentication',
      options,
      order: this.getCurrentMiddlewareOrder()
    });
    return this;
  }

  authorize(options: any): this {
    this.addMiddleware({
      type: 'authorization',
      options,
      order: this.getCurrentMiddlewareOrder()
    });
    return this;
  }

  validate(schema: any): this {
    this.addMiddleware({
      type: 'validation',
      options: { schema },
      order: this.getCurrentMiddlewareOrder()
    });
    return this;
  }

  logging(options: any): this {
    this.addMiddleware({
      type: 'logging',
      options,
      order: this.getCurrentMiddlewareOrder()
    });
    return this;
  }

  cache(options: any): this {
    this.addMiddleware({
      type: 'cache',
      options,
      order: this.getCurrentMiddlewareOrder()
    });
    return this;
  }

  // UseCase integration
  useCase(useCaseClass: any): this {
    if (this.currentRoute) {
      this.currentRoute.useCase = useCaseClass;
    }
    return this;
  }

  // RouteIO integration
  routeIO(routeIO: any): this {
    if (this.currentRoute) {
      this.currentRoute.routeIO = routeIO;
    }
    return this;
  }

  initialize(...args: unknown[]): any {
    if (this.initialized) {
      return this;
    }

    this.setupRoutes(...args);
    this.initialized = true;
    return this;
  }

  setupRoutes(...args: unknown[]): void {
    // Override in subclasses to define routes
    // This method should be implemented by specific router implementations
  }

  async reloadRoutes(...args: unknown[]): Promise<void> {
    this.routes = [];
    this.initialized = false;
    await this.initialize(...args);
  }

  mount(data: RouteMetadata | RouteMetadata[]): any {
    if (Array.isArray(data)) {
      this.routes.push(...data);
    } else {
      this.routes.push(data);
    }
    return this;
  }

  // Mount routes to Express app with middlewares
  mountToExpress(app: Express, container?: any): void {
    this.routes.forEach((route: RouteMetadata) => {
      const fullPath = this.createFullPath(route.path);
      const middlewares = this.buildMiddlewares(route.middlewares || []);
      const method = Array.isArray(route.method) ? route.method[0] : route.method;
      
      app[method.toLowerCase()](fullPath, ...middlewares, async (req: Request, res: Response, next: NextFunction) => {
        try {
          let result;

          if (route.useCase && container) {
            const useCase = resolveUseCase(container, route.useCase);
            const input = route.routeIO ? route.routeIO.from(req) : req.body;
            result = await (useCase as any).execute(input);
          } else if (route.handler) {
            result = await route.handler(req, res);
          }

          dispatchResult(result, res, route.routeIO);
        } catch (error) {
          if (this.errorHandler) {
            this.errorHandler.handler(error, req, res);
          } else {
            next(error);
          }
        }
      });
    });
  }

  // Build middlewares from metadata, delegating to the shared MiddlewareFactory
  // so the fluent router uses the exact same implementations as decorator routes.
  private buildMiddlewares(middlewares: MiddlewareMetadata[]): any[] {
    return middlewares.map(middleware => {
      if (middleware.type === 'custom') {
        return middleware.middleware;
      }
      return this.middlewareFactory.create(middleware);
    });
  }

  // Set error handler
  setErrorHandler(errorHandler: RouteErrorHandler): this {
    this.errorHandler = errorHandler;
    return this;
  }

  // Additional utility methods
  getRoutes(): RouteMetadata[] {
    return [...this.routes];
  }

  getRouteCount(): number {
    return this.routes.length;
  }

  clearRoutes(): void {
    this.routes = [];
  }

  // Helper method to create full path with prefix and version
  createFullPath(path: string): string {
    let fullPath = '';
    
    if (this.apiVersion) {
      fullPath += `/v${this.apiVersion}`;
    }
    
    if (this.prefix) {
      fullPath += this.prefix;
    }
    
    if (path && path !== '/') {
      fullPath += path;
    }
    
    return fullPath || '/';
  }

  // Method to check if router is initialized
  isInitialized(): boolean {
    return this.initialized;
  }

  // Helper methods
  private addRoute(method: string, path: string, handler: RouteHandler): void {
    const fullPath = this.createFullPath(path);
    const route: RouteMetadata = {
      method: method as any,
      path: fullPath,
      handler,
      middlewares: [...this.middlewares]
    };
    
    this.routes.push(route);
    this.currentRoute = route;
  }

  private addMiddleware(middleware: MiddlewareMetadata): void {
    this.middlewares.push(middleware);
  }

  private getCurrentMiddlewareOrder(): number {
    return this.middlewares.length;
  }

  // Get base path
  getBasePath(): string {
    return this.prefix || '';
  }

  // Clear routes (for testing)
  clear(): void {
    this.routes = [];
    this.middlewares = [];
    this.currentRoute = null;
  }
}
