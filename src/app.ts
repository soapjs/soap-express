import express, { Express, Request, Response, NextFunction } from 'express';
import { createServer, Server } from 'http';
import { SecurityOptions, SoapExpressOptions } from './types';
import { DecoratorRegistry } from './decorators/registry';
import { RouteBuilder } from './utils/route-builder';
import { ErrorHandler } from './error-handling/error-handler';
// Deep imports — load only the HTTP slice of @soapjs/soap (49 modules vs 119 for the barrel).
// When @soapjs/soap adds a proper "exports" map, these can be simplified to '@soapjs/soap/http'.
import {
  BaseHttpApp,
  RouteRegistry,
  RouteGroup,
  Route,
  HttpPlugin,
  HttpPluginManager,
  MetricsPlugin,
  MemoryMonitoringPlugin,
  Router
} from '@soapjs/soap/http';
import type {
  MemoryMonitoringPluginOptions,
  MemoryMonitor,
  MemoryStats,
  MetricsCollector,
  MetricsPluginOptions,
} from '@soapjs/soap/http';
import { MiddlewareRegistry } from '@soapjs/soap/middleware';
import { AuthRegistry, AuthMiddlewareFactory, AuthStrategy } from './auth';
import { RateLimitMiddleware } from './middlewares/rate-limit';

export class SoapExpressApp extends BaseHttpApp<Express> {
  private app: Express;
  private server?: Server;
  private routeBuilder: RouteBuilder;
  private errorHandler: ErrorHandler;
  private authRegistry: AuthRegistry;
  private authMiddlewareFactory: AuthMiddlewareFactory;
  private metricsPlugin?: MetricsPlugin;
  private memoryMonitoringPlugin?: MemoryMonitoringPlugin;

  constructor(options: SoapExpressOptions) {
    // Minimal Router stub for BaseHttpApp; route mounting is handled by RouteBuilder.
    const router = {
      initialize: () => router,
      setupRoutes: () => {},
      reloadRoutes: () => Promise.resolve(),
      mount: () => router
    } as unknown as Router;

    super(router, options.logger);

    // Plugins resolve the app via HttpPluginManager — without this, async
    // installs (MetricsPlugin, …) receive `undefined` and reject after listen.
    (this.pluginManager as HttpPluginManager).setApp(this);

    this.app = express();
    // Auto-attach the framework logger to the error handler so failures are
    // emitted through the same sink as everything else, even when the user
    // didn't supply an explicit ErrorHandlerOptions.port.
    const errorHandlerOptions = options.errorHandlerOptions
      ? { ...options.errorHandlerOptions }
      : {};
    if (!errorHandlerOptions.port) {
      errorHandlerOptions.port = this.logger;
    }
    this.errorHandler = new ErrorHandler(options.errorHandler as any, errorHandlerOptions);
    this.routeBuilder = new RouteBuilder(this.app, this.container, this.errorHandler);
    this.authRegistry = new AuthRegistry();
    this.authMiddlewareFactory = new AuthMiddlewareFactory(this.authRegistry);

    // Make the auth middleware factory resolvable for the route builder.
    this.container.bindValue('AuthMiddlewareFactory', this.authMiddlewareFactory);

    this.initializeFramework();
    if (options.security) {
      this.useSecurity(options.security);
    }
  }

  // ── Abstract methods from BaseHttpApp ──────────────────────────────────────

  initializeFramework(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  // ── Controller registration ────────────────────────────────────────────────

  registerController(controllers: any | any[]): this {
    if (Array.isArray(controllers)) {
      controllers.forEach(controller => this.registerSingleController(controller));
    } else {
      this.registerSingleController(controllers);
    }
    return this;
  }

  /** Alias for {@link registerController}. */
  registerControllers(controllers: any[]): this {
    return this.registerController(controllers);
  }

  private registerSingleController(controller: any): void {
    const controllerMetadata = DecoratorRegistry.getControllers().get(controller.name);
    if (!controllerMetadata) {
      throw new Error(`Controller ${controller.name} not found in registry`);
    }
    this.routeBuilder.registerController(controller);
  }

  // ── Route registration ───────────────────────────────────────────────────

  registerRouter(router: any): this {
    this.routeBuilder.registerRouter(router);
    return this;
  }

  /**
   * Override BaseHttpApp.register() so that every route / group added through
   * the framework-agnostic API is also immediately mounted on the Express app.
   * This makes app.register(route) and app.registerRoute(route) equivalent.
   */
  override register(...items: (Route | RouteGroup)[]): this {
    items.forEach(item => {
      if ((item as RouteGroup).routes !== undefined) {
        this.routeBuilder.registerRouteGroup(item as RouteGroup);
      } else {
        this.routeBuilder.registerRoute(item as Route);
      }
    });
    return super.register(...items);
  }

  registerRoute(route: Route): this {
    return this.register(route);
  }

  registerRouteGroup(group: RouteGroup): this {
    return this.register(group);
  }

  registerMiddleware(middleware: any, ready: boolean = true): this {
    this.middlewareRegistry.add(middleware, ready);
    return this;
  }

  useSecurity(options: SecurityOptions = {}): this {
    const {
      disablePoweredBy = true,
      trustProxy,
      helmet,
      cors,
      throttle,
    } = options;

    if (disablePoweredBy) {
      this.app.disable('x-powered-by');
    }

    if (trustProxy !== undefined) {
      this.app.set('trust proxy', trustProxy);
    }

    if (helmet) {
      const helmetFactory = require('helmet');
      this.app.use(helmetFactory(helmet === true ? undefined : helmet));
    }

    if (cors) {
      const corsFactory = require('cors');
      this.app.use(corsFactory(cors === true ? undefined : cors));
    }

    if (throttle) {
      RateLimitMiddleware
        .createSecurityThrottle(throttle)
        .forEach(middleware => this.app.use(middleware));
    }

    return this;
  }

  getRouteRegistry(): RouteRegistry {
    return this.routeRegistry;
  }

  getMiddlewareRegistry(): MiddlewareRegistry {
    return this.middlewareRegistry;
  }

  // ── Auth ────────────────────────────────────────────────────────────────

  registerAuthStrategy(strategy: AuthStrategy): this {
    this.authRegistry.register(strategy);
    return this;
  }

  /**
   * Registers all HTTP strategies from a SoapAuth instance (or any compatible
   * auth provider) into this app's AuthRegistry.
   *
   * Accepts any object with `listStrategies(type)` and `getStrategy(name, type)`
   * so soap-express does not need a direct dependency on soap-auth.
   */
  registerAuth(provider: {
    listStrategies(type: string): string[];
    getStrategy(name: string, type: string): AuthStrategy;
  }): this {
    for (const name of provider.listStrategies('http')) {
      this.authRegistry.register(provider.getStrategy(name, 'http'));
    }
    return this;
  }

  getAuthRegistry(): AuthRegistry {
    return this.authRegistry;
  }

  getAuthMiddlewareFactory(): AuthMiddlewareFactory {
    return this.authMiddlewareFactory;
  }

  // ── Plugins ─────────────────────────────────────────────────────────────

  usePlugin(plugin: HttpPlugin, options?: any): this {
    return super.usePlugin(plugin, options);
  }

  useMetrics(options: Partial<MetricsPluginOptions> = {}): this {
    this.metricsPlugin = new MetricsPlugin(options, this.logger);
    return this.usePlugin(this.metricsPlugin, options);
  }

  getMetricsPlugin(): MetricsPlugin | undefined {
    return this.metricsPlugin;
  }

  getMetricsCollector(): MetricsCollector | undefined {
    return this.metricsPlugin?.getCollector();
  }

  getMetricsData(): unknown {
    return this.metricsPlugin?.getMetricsData();
  }

  useMemoryMonitoring(options: Partial<MemoryMonitoringPluginOptions> = {}): this {
    this.memoryMonitoringPlugin = new MemoryMonitoringPlugin(options, this.logger);
    return this.usePlugin(this.memoryMonitoringPlugin, options);
  }

  getMemoryMonitoringPlugin(): MemoryMonitoringPlugin | undefined {
    return this.memoryMonitoringPlugin;
  }

  getMemoryMonitor(): MemoryMonitor | undefined {
    return this.memoryMonitoringPlugin?.getMonitor();
  }

  getMemoryStats(): MemoryStats | undefined {
    return this.memoryMonitoringPlugin?.getMemoryStats();
  }

  getMemorySummary(): ReturnType<MemoryMonitoringPlugin['getMemorySummary']> | undefined {
    return this.memoryMonitoringPlugin?.getMemorySummary();
  }

  // ── Dependency Injection helpers ──────────────────────────────────────────

  registerService<T>(token: string, service: new (...args: any[]) => T): this {
    this.container.bindClass(token, service);
    return this;
  }

  /** Register a class, optionally with an explicit token (otherwise auto-registered). */
  registerClass<T>(service: new (...args: any[]) => T, token?: string | symbol): this {
    if (token) {
      this.container.bindClass(token as string, service);
    } else {
      (this.container as any).autoRegister?.(service);
    }
    return this;
  }

  registerValue<T>(token: string, value: T): this {
    this.container.bindValue(token, value);
    return this;
  }

  registerFactory<T>(token: string, factory: (...args: any[]) => T): this {
    this.container.bindFactory(token, factory);
    return this;
  }

  getService<T>(token: string): T {
    return this.container.get<T>(token);
  }

  hasService(token: string): boolean {
    return this.container.has(token);
  }

  // ── Convenience ────────────────────────────────────────────────────────

  /** Adds a simple liveness endpoint. Default path: GET /health. */
  healthCheck(path: string = '/health'): this {
    this.app.get(path, (_req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    return this;
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  async start(port: number = 3000): Promise<void> {
    await this.beforeStart();

    // Error handler must be registered after all routes; Express identifies it
    // by its 4-argument signature.
    this.app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
      this.errorHandler.handle(error, req, res);
    });

    return new Promise<void>((resolve, reject) => {
      this.server = createServer(this.app);
      this.server.listen(port, (error?: Error) => {
        if (error) {
          reject(error);
          return;
        }
        this.logger.info(`HTTP Server running on port ${port}`);
        this.state = 'started';
        this.afterStart().then(() => resolve());
      });
    });
  }

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

  getApp(): Express {
    return this.app;
  }

  getServer<T = Server>(): T {
    return this.server as T;
  }
}
