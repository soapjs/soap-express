import { Express, Request, Response, NextFunction } from 'express';
import { DecoratorRegistry } from '../decorators/registry';
import { MiddlewareFactory } from './middleware-factory';
import { Route, RouteGroup, RouteAdditionalOptions, MiddlewareMetadata, RouteMetadata } from '@soapjs/soap/http';
import { DIContainer } from '@soapjs/soap/common';
import { dispatchResult, resolveUseCase } from './route-dispatch';
import { buildLegacyValidationMiddlewares } from './validation-middleware';

export class RouteBuilder {
  private middlewareFactory: MiddlewareFactory;

  constructor(private app: Express, private container: DIContainer, private errorHandler?: any) {
    this.middlewareFactory = new MiddlewareFactory();
  }

  registerController(controller: any) {
    const controllerMetadata = DecoratorRegistry.getControllers().get(controller.name);
    if (!controllerMetadata) {
      throw new Error(`Controller ${controller.name} not found in registry`);
    }

    // Register controller-level middlewares
    if (controllerMetadata.middlewares) {
      this.registerControllerMiddlewares(controllerMetadata.middlewares);
    }

    // Register routes
    const routes = DecoratorRegistry.getRoutes();
    routes.forEach((routeMetadata, key) => {
      if (key.startsWith(controller.name)) {
        this.registerControllerRoute(controller, routeMetadata);
      }
    });
  }

  registerRouter(router: any) {
    const routes = router.getRoutes();
    const routerErrorHandler = router.getErrorHandler?.();
    
    routes.forEach((route: RouteMetadata) => {
      const middlewares = this.buildMiddlewares(route.middlewares);
      const method = Array.isArray(route.method) ? route.method[0] : route.method;
      
      this.app[method.toLowerCase()](route.path, ...middlewares, async (req: Request, res: Response, next: NextFunction) => {
        try {
          let result;
          if (route.useCase) {
            const useCase = resolveUseCase(this.container, route.useCase);
            const input = route.routeIO ? route.routeIO.from(req) : req.body;
            result = await (useCase as any).execute(input);
          } else if (route.handler) {
            result = await route.handler(req, res);
          }
          dispatchResult(result, res, route.routeIO);
        } catch (error) {
          if (this.errorHandler) {
            this.errorHandler.handle(error, req, res, routerErrorHandler);
          } else {
            next(error);
          }
        }
      });
    });
  }

  private registerControllerRoute(controller: any, metadata: RouteMetadata) {
    const controllerMetadata = DecoratorRegistry.getControllers().get(controller.name);
    if (!controllerMetadata) {
      throw new Error(`Controller ${controller.name} not found in registry`);
    }

    const fullPath = `${controllerMetadata.basePath}${metadata.path}`;
    const middlewares = this.buildMiddlewares(metadata.middlewares);
    const routeOptionMiddlewares = this.buildRouteMiddlewares(metadata.options);

    // Add auth middlewares if auth metadata exists
    const authMiddlewares = this.buildAuthMiddlewares(controller, metadata);
    const allMiddlewares = [...middlewares, ...routeOptionMiddlewares, ...authMiddlewares];
    
    const controllerInstance = this.container.get(controller.name);

    this.app[metadata.method.toLowerCase()](fullPath, ...allMiddlewares, async (req: Request, res: Response, next: NextFunction) => {
      try {
        let result;

        if (metadata.useCase) {
          const useCase = resolveUseCase(this.container, metadata.useCase);
          const input = metadata.routeIO ? metadata.routeIO.from(req) : req.body;
          result = await (useCase as any).execute(input);
        } else {
          const propertyKey = this.getPropertyKey(controller.name, metadata);
          result = await controllerInstance[propertyKey](req, res);
        }

        dispatchResult(result, res, metadata.routeIO);
      } catch (error) {
        const e = error as Error;
        if (this.errorHandler) {
          this.errorHandler.handle(e, req, res);
        } else {
          next(e);
        }
      }
    });
  }

  private registerControllerMiddlewares(middlewares: MiddlewareMetadata[]) {
    middlewares.forEach(middleware => {
      const middlewareInstance = this.middlewareFactory.create(middleware);
      this.app.use(middlewareInstance);
    });
  }

  private buildMiddlewares(middlewares: MiddlewareMetadata[]): any[] {
    return middlewares
      .sort((a, b) => a.order - b.order)
      .map(middleware => this.middlewareFactory.create(middleware));
  }

  private getPropertyKey(controllerName: string, metadata: RouteMetadata): string {
    const routes = DecoratorRegistry.getRoutes();
    for (const [key, route] of routes.entries()) {
      if (key.startsWith(controllerName) && route === metadata) {
        return key.split('.').pop() || '';
      }
    }
    return '';
  }

  private buildAuthMiddlewares(controller: any, metadata: RouteMetadata): any[] {
    const middlewares: any[] = [];
    
    // Get auth metadata from controller method
    const propertyKey = this.getPropertyKey(controller.name, metadata);
    const authMetadata = controller.__authMetadata?.get(propertyKey);
    
    if (authMetadata) {
      // If auth is not required, skip
      if (authMetadata.required === false) {
        return middlewares;
      }
      
      // Get auth middleware factory from container
      const authMiddlewareFactory = this.container.get('AuthMiddlewareFactory') as any;
      if (authMiddlewareFactory) {
        // Decide which auth strategy to enforce. If the caller didn't name
        // one (e.g. `@AdminOnly()` / `@Auth({ roles: ... })`), but role
        // checks are requested, fall back to the first registered strategy
        // — otherwise the role middleware would run with `req.user` unset
        // and reject every request with "User not authenticated".
        let strategy: string | undefined = authMetadata.strategy;
        if (!strategy && authMetadata.roles) {
          strategy = authMiddlewareFactory.getRegistry?.()?.getDefaultName();
        }

        if (strategy) {
          const authMiddleware = authMiddlewareFactory.createAuthMiddleware(strategy);
          middlewares.push(authMiddleware);
        }

        // Create role middleware if roles are specified
        if (authMetadata.roles) {
          const roleMiddleware = authMiddlewareFactory.createRoleMiddleware(
            authMetadata.roles
          );
          middlewares.push(roleMiddleware);
        }
      }
    }
    
    return middlewares;
  }

  // Register Route from @soapjs/soap
  registerRoute(route: Route) {
    const paths = Array.isArray(route.path) ? route.path : [route.path];
    const methods = Array.isArray(route.method) ? route.method : [route.method];
    
    paths.forEach(path => {
      methods.forEach(method => {
        const middlewares = this.buildRouteMiddlewares(route.options);
        
        this.app[method.toLowerCase()](path, ...middlewares, async (req: Request, res: Response, next: NextFunction) => {
          try {
            let result;

            if (route.io) {
              const input = route.io.from(req);
              result = await route.handler(input);
            } else {
              result = await route.handler(req, res);
            }

            dispatchResult(result, res, route.io);
          } catch (error) {
            if ((route as any).errorHandler) {
              (route as any).errorHandler.handler(error, req, res);
            } else if (this.errorHandler) {
              this.errorHandler.handle(error, req, res);
            } else {
              next(error);
            }
          }
        });
      });
    });
  }

  // Register RouteGroup from @soapjs/soap
  registerRouteGroup(group: RouteGroup) {
    group.routes.forEach(route => {
      this.registerRoute(route);
    });
  }

  // Build middlewares from route options
  private buildRouteMiddlewares(options?: RouteAdditionalOptions): any[] {
    const middlewares: any[] = [];
    
    if (!options) return middlewares;

    // CORS middleware
    if (options.cors) {
      const cors = require('cors');
      middlewares.push(cors(options.cors));
    }

    // Rate limiting middleware
    if (options.rateLimit) {
      const rateLimit = require('express-rate-limit');
      middlewares.push(rateLimit(options.rateLimit));
    }

    // Security middleware
    if (options.security) {
      const helmet = require('helmet');
      middlewares.push(helmet(options.security));
    }

    // Compression middleware
    if (options.compression) {
      const compression = require('compression');
      middlewares.push(compression(options.compression));
    }

    // Legacy Joi validation; Zod/other adapters use `options.middlewares.pre` from the app
    middlewares.push(...buildLegacyValidationMiddlewares(options));

    // Custom middlewares
    if (options.middlewares?.pre) {
      middlewares.push(...options.middlewares.pre);
    }

    return middlewares;
  }

}
