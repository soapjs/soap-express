import express, { Express, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { SoapExpressOptions } from './types';
import { DecoratorRegistry } from './decorators/registry';
import { RouteBuilder } from './utils/route-builder';
import { ErrorHandler } from './error-handling/error-handler';
import { 
  DIContainer, 
  container, 
  registerClass as diRegisterClass, 
  registerValue, 
  registerFactory, 
  get, 
  has,
  RouteRegistry,
  RouteGroup,
  Route,
  MiddlewareRegistry
} from '@soapjs/soap';
import { AuthRegistry, AuthMiddlewareFactory, AuthStrategy } from './auth';
import { SoapMetricsCollector, MetricsConfig, MetricsMiddleware } from './metrics';
import { MemoryMonitor, MemoryMonitoringConfig, MemoryMonitoringMiddleware } from './monitoring';
import { SecurityMiddleware, SecurityConfig } from './security';
import { SoapExpressPluginManager, SoapExpressPlugin, PluginConfig } from './plugins';

export class SoapExpressApp {
  private app: Express;
  private server: any;
  private container: DIContainer;
  private routeBuilder: RouteBuilder;
  private errorHandler: ErrorHandler;
  private routeRegistry: RouteRegistry;
  private middlewareRegistry: MiddlewareRegistry;
  private authRegistry: AuthRegistry;
  private authMiddlewareFactory: AuthMiddlewareFactory;
  private metricsCollector?: SoapMetricsCollector;
  private metricsMiddleware?: MetricsMiddleware;
  private memoryMonitor?: MemoryMonitor;
  private memoryMiddleware?: MemoryMonitoringMiddleware;
  private securityMiddleware?: SecurityMiddleware;
  private pluginManager: SoapExpressPluginManager;

  constructor(options: SoapExpressOptions) {
    this.app = express();
    this.container = options.container || container;
    this.errorHandler = new ErrorHandler(options.errorHandler as any, options.errorHandlerOptions);
    this.routeBuilder = new RouteBuilder(this.app, this.container, this.errorHandler);
    this.routeRegistry = new RouteRegistry();
    this.middlewareRegistry = new MiddlewareRegistry();
    this.authRegistry = new AuthRegistry();
    this.authMiddlewareFactory = new AuthMiddlewareFactory(this.authRegistry);
    this.pluginManager = new SoapExpressPluginManager();
    
    // Set app instance in plugin manager
    this.pluginManager.setApp(this);
    
    // Register auth middleware factory in container
    this.container.bindValue('AuthMiddlewareFactory', this.authMiddlewareFactory);
    
    this.setupApp();
  }

  private setupApp() {
    // Basic middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Error handling will be added at the end after all routes
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

  // Auth methods
  registerAuthStrategy(strategy: AuthStrategy) {
    this.authRegistry.register(strategy);
    return this;
  }

  getAuthRegistry(): AuthRegistry {
    return this.authRegistry;
  }

  getAuthMiddlewareFactory(): AuthMiddlewareFactory {
    return this.authMiddlewareFactory;
  }

  // Metrics methods
  useMetrics(config: MetricsConfig) {
    this.metricsCollector = new SoapMetricsCollector(config);
    this.metricsMiddleware = new MetricsMiddleware(config);
    
    // Register metrics middleware
    this.app.use(this.metricsMiddleware.middleware());
    
    return this;
  }

  getMetricsCollector(): SoapMetricsCollector | undefined {
    return this.metricsCollector;
  }

  getMetricsMiddleware(): MetricsMiddleware | undefined {
    return this.metricsMiddleware;
  }

  // Memory monitoring methods
  useMemoryMonitoring(config: MemoryMonitoringConfig) {
    this.memoryMonitor = new MemoryMonitor(config);
    this.memoryMiddleware = new MemoryMonitoringMiddleware(config);
    
    // Register memory monitoring middleware
    this.app.use(this.memoryMiddleware.middleware());
    
    return this;
  }

  getMemoryMonitor(): MemoryMonitor | undefined {
    return this.memoryMonitor;
  }

  getMemoryMiddleware(): MemoryMonitoringMiddleware | undefined {
    return this.memoryMiddleware;
  }

  // Security methods
  useSecurity(config: SecurityConfig) {
    this.securityMiddleware = new SecurityMiddleware(config);
    
    // Register security middleware
    this.app.use(this.securityMiddleware.middleware());
    
    return this;
  }

  getSecurityMiddleware(): SecurityMiddleware | undefined {
    return this.securityMiddleware;
  }

  // Plugin management methods
  usePlugin(plugin: SoapExpressPlugin, options?: any): this {
    this.pluginManager.usePlugin(plugin, options);
    return this;
  }

  async loadPlugin(pluginName: string, options?: any): Promise<this> {
    await this.pluginManager.loadPlugin(pluginName, options);
    return this;
  }

  unloadPlugin(pluginName: string): this {
    this.pluginManager.unloadPlugin(pluginName);
    return this;
  }

  listPlugins(): SoapExpressPlugin[] {
    return this.pluginManager.listPlugins();
  }

  getPlugin(pluginName: string): SoapExpressPlugin | undefined {
    return this.pluginManager.getPlugin(pluginName);
  }

  isPluginLoaded(pluginName: string): boolean {
    return this.pluginManager.isPluginLoaded(pluginName);
  }

  async loadPluginsFromDirectory(dir: string): Promise<this> {
    await this.pluginManager.loadPluginsFromDirectory(dir);
    return this;
  }

  getPluginManager(): SoapExpressPluginManager {
    return this.pluginManager;
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
  async start(port: number = 3000) {
    // Call beforeStart hooks for all installed plugins
    const installedPlugins = this.pluginManager.getInstalled();
    for (const plugin of installedPlugins) {
      if (plugin.beforeStart) {
        plugin.beforeStart(this);
      }
    }

    // Add error handler at the end, after all routes
    // Express error middleware must have 4 parameters: (error, req, res, next)
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      this.errorHandler.handle(error, req, res);
    });
    
    return new Promise<any>((resolve, reject) => {
      this.server = createServer(this.app);
      this.server.listen(port, (error: any) => {
        if (error) {
          reject(error);
        } else {
          console.log(`HTTP Server running on port ${port}`);
          
          // Call afterStart hooks for all installed plugins
          for (const plugin of installedPlugins) {
            if (plugin.afterStart) {
              plugin.afterStart(this);
            }
          }
          
          resolve(this.server);
        }
      });
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
    diRegisterClass(token, service);
    return this;
  }

  // New DI method using class as token
  registerClass<T>(service: new (...args: any[]) => T, token?: string | symbol) {
    if (token) {
      diRegisterClass(service, token);
    } else {
      diRegisterClass(service);
    }
    return this;
  }

  registerValue<T>(token: string, value: T) {
    registerValue(token, value);
    return this;
  }

  registerFactory<T>(token: string, factory: (...args: any[]) => T) {
    registerFactory(token, factory);
    return this;
  }

  getService<T>(token: string): T {
    return get<T>(token);
  }

  hasService(token: string): boolean {
    return has(token);
  }

  // Get container for advanced usage
  getContainer(): DIContainer {
    return this.container;
  }

  // Cleanup method
  destroy(): void {
    // Call beforeStop hooks for all installed plugins
    const installedPlugins = this.pluginManager.getInstalled();
    for (const plugin of installedPlugins) {
      if (plugin.beforeStop) {
        plugin.beforeStop(this);
      }
    }

    // Cleanup existing services
    if (this.metricsMiddleware) {
      this.metricsMiddleware.destroy();
    }
    if (this.metricsCollector) {
      this.metricsCollector.destroy();
    }
    if (this.memoryMiddleware) {
      this.memoryMiddleware.destroy();
    }
    if (this.memoryMonitor) {
      this.memoryMonitor.destroy();
    }
    if (this.securityMiddleware) {
      this.securityMiddleware.clearViolations();
    }

    // Call afterStop hooks for all installed plugins
    for (const plugin of installedPlugins) {
      if (plugin.afterStop) {
        plugin.afterStop(this);
      }
    }
  }
}
