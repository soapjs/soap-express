import express, { Express, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { SoapExpressOptions } from './types';
import { DecoratorRegistry } from './decorators/registry';
import { RouteBuilder } from './utils/route-builder';
import { ErrorHandler } from './error-handling/error-handler';
import { 
  DIContainer, 
  container, 
  Injectable,
  get, 
  has,
  RouteRegistry,
  RouteGroup,
  Route,
  MiddlewareRegistry,
  HttpApp,
  BaseHttpApp,
  HttpPlugin,
  PluginManager,
  Router,
  Middleware,
  MiddlewareFunction,
  Result,
  Failure,
  ConsoleLogger
} from '@soapjs/soap';
import { AuthRegistry, AuthMiddlewareFactory, AuthStrategy } from './auth';

export class SoapExpressApp extends BaseHttpApp<Express> {
  private app: Express;
  private server: any;
  private routeBuilder: RouteBuilder;
  private errorHandler: ErrorHandler;
  private authRegistry: AuthRegistry;
  private authMiddlewareFactory: AuthMiddlewareFactory;
  private logger: ConsoleLogger;

  constructor(options: SoapExpressOptions) {
    // Create a simple router for BaseHttpApp
    const router = {
      initialize: () => router,
      setupRoutes: () => {},
      reloadRoutes: () => Promise.resolve(),
      mount: () => router
    } as Router;
    
    super(router);
    
    this.app = express();
    this.errorHandler = new ErrorHandler(options.errorHandler as any, options.errorHandlerOptions);
    this.routeBuilder = new RouteBuilder(this.app, this.container, this.errorHandler);
    this.authRegistry = new AuthRegistry();
    this.authMiddlewareFactory = new AuthMiddlewareFactory(this.authRegistry);
    this.logger = new ConsoleLogger();
    
    // Register auth middleware factory in container
    this.container.bindValue('AuthMiddlewareFactory', this.authMiddlewareFactory);
    
    this.initializeFramework();
    this.setupApp();
  }

  // Abstract methods from BaseHttpApp
  initializeFramework(): void {
    // Initialize Express-specific framework components
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupApp() {
    // Additional Express setup
    this.logger.info('SoapExpressApp initialized');
  }

  // Controller registration
  registerController(controllers: any | any[]) {
    if (Array.isArray(controllers)) {
      controllers.forEach(controller => this.registerSingleController(controller));
    } else {
      this.registerSingleController(controllers);
    }
  }

  // Alias for registerController
  registerControllers(controllers: any[]) {
    this.registerController(controllers);
  }

  private registerSingleController(controller: any) {
    const controllerMetadata = DecoratorRegistry.getControllers().get(controller.name);
    if (!controllerMetadata) {
      throw new Error(`Controller ${controller.name} not found in registry`);
    }

    // Register controller-level middlewares
    if (controllerMetadata.middlewares) {
      this.registerControllerMiddlewares(controllerMetadata.middlewares);
    }

    // Register routes
    this.routeBuilder.registerController(controller);
  }

  // Router registration
  registerRouter(router: any) {
    this.routeBuilder.registerRouter(router);
  }

  // Route registration using @soapjs/soap components
  registerRoute(route: Route) {
    this.routeRegistry.register(route);
    this.routeBuilder.registerRoute(route);
  }

  // Route group registration
  registerRouteGroup(group: RouteGroup) {
    this.routeRegistry.register(group);
    this.routeBuilder.registerRouteGroup(group);
  }

  // Middleware registration
  registerMiddleware(middleware: any, ready: boolean = true) {
    this.middlewareRegistry.add(middleware, ready);
  }

  // Get route registry
  getRouteRegistry(): RouteRegistry {
    return this.routeRegistry;
  }

  // Get middleware registry
  getMiddlewareRegistry(): MiddlewareRegistry {
    return this.middlewareRegistry;
  }


  getAuthMiddlewareFactory(): AuthMiddlewareFactory {
    return this.authMiddlewareFactory;
  }

  // Auth methods
  registerAuthStrategy(strategy: AuthStrategy) {
    this.authRegistry.register(strategy);
    return this;
  }

  getAuthRegistry(): AuthRegistry {
    return this.authRegistry;
  }

  // Plugin management methods (using BaseHttpApp's plugin system)
  usePlugin(plugin: HttpPlugin, options?: any): this {
    return super.usePlugin(plugin, options);
  }

  private registerControllerMiddlewares(middlewares: any[]) {
    middlewares.forEach(middleware => {
      this.app.use(this.createMiddleware(middleware));
    });
  }

  private createMiddleware(middleware: any): any {
    // Implementation depends on middleware type
    return middleware.middleware || middleware;
  }

  // Start server
  async start(port: number = 3000): Promise<void> {
    await this.beforeStart();
    
    // Add error handler at the end, after all routes
    // Express error middleware must have 4 parameters: (error, req, res, next)
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      this.errorHandler.handle(error, req, res);
    });
    
    return new Promise<void>((resolve, reject) => {
      this.server = createServer(this.app);
      this.server.listen(port, (error: any) => {
        if (error) {
          reject(error);
        } else {
          this.logger.info(`HTTP Server running on port ${port}`);
          this.state = 'started';
          this.afterStart().then(() => resolve());
        }
      });
    });
  }

  // Stop server
  async stop(): Promise<void> {
    await this.beforeStop();
    
    return new Promise<void>((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.logger.info('HTTP Server stopped');
          this.state = 'stopped';
          this.afterStop().then(() => resolve());
        });
      } else {
        resolve();
      }
    });
  }

  // Get Express app
  getApp(): Express {
    return this.app;
  }

  // Get HTTP server
  getServer(): any {
    return this.server;
  }

  // Health check
  healthCheck() {
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
  }

  // Dependency Injection helpers
  registerService<T>(token: string, service: new (...args: any[]) => T) {
    this.container.bindClass(token, service);
    return this;
  }

  // New DI method using class as token
  registerClass<T>(service: new (...args: any[]) => T, token?: string | symbol) {
    if (token) {
      this.container.bindClass(token as string, service);
    } else {
      this.container.autoRegister(service);
    }
    return this;
  }

  registerValue<T>(token: string, value: T) {
    this.container.bindValue(token, value);
    return this;
  }

  registerFactory<T>(token: string, factory: (...args: any[]) => T) {
    this.container.bindFactory(token, factory);
    return this;
  }

  getService<T>(token: string): T {
    return this.container.get<T>(token);
  }

  hasService(token: string): boolean {
    return this.container.has(token);
  }

  // Get container for advanced usage
  getContainer(): DIContainer {
    return this.container;
  }

  // Cleanup method
  destroy(): void {
    this.logger.info('SoapExpressApp destroying...');
    // BaseHttpApp handles plugin lifecycle
  }
}
