import { Express, Request, Response, NextFunction } from 'express';
import { DecoratorRegistry } from '../decorators/registry';
import { MiddlewareFactory } from './middleware-factory';
import { Route, RouteGroup, DIContainer, RouteAdditionalOptions, MiddlewareMetadata, RouteMetadata } from '@soapjs/soap';

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
            // UseCase execution
            const useCase = this.container.get(route.useCase.name);
            const input = route.routeIO ? route.routeIO.from(req) : req.body;
            result = await (useCase as any).execute(input);
            
            // Response mapping
            if (route.routeIO) {
              route.routeIO.to(result, res);
            } else {
              res.json(result);
            }
          } else if (route.handler) {
            // Handler execution
            result = await route.handler(req, res);
            
            // Response mapping
            if (route.routeIO) {
              route.routeIO.to(result, res);
            } else {
              res.json(result);
            }
          }
        } catch (error) {
          if (this.errorHandler) {
            // Use ErrorHandler with router error handler
            this.errorHandler.handle(error, req, res, routerErrorHandler);
          } else {
            // Fallback to Express error middleware
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
    
    // Add auth middlewares if auth metadata exists
    const authMiddlewares = this.buildAuthMiddlewares(controller, metadata);
    const allMiddlewares = [...middlewares, ...authMiddlewares];
    
    const controllerInstance = this.container.get(controller.name);

    this.app[metadata.method.toLowerCase()](fullPath, ...allMiddlewares, async (req: Request, res: Response, next: NextFunction) => {
      try {
        let result;
        
        if (metadata.useCase) {
          // UseCase execution
          const useCase = this.container.get(metadata.useCase.name);
          const input = metadata.routeIO ? metadata.routeIO.from(req) : req.body;
          result = await (useCase as any).execute(input);
          
          // Response mapping
          if (metadata.routeIO) {
            metadata.routeIO.to(result, res);
          } else {
            res.json(result);
          }
        } else {
          // Handler execution
          const propertyKey = this.getPropertyKey(controller.name, metadata);
          result = await controllerInstance[propertyKey](req, res);
          
          // Response mapping
          if (metadata.routeIO) {
            metadata.routeIO.to(result, res);
          } else {
            res.json(result);
          }
        }
      } catch (error) {
        const e = error as Error;
        if (this.errorHandler) {
          // Use ErrorHandler without route-specific error handler (deprecated)
          this.errorHandler.handle(e, req, res);
        } else {
          // Fallback to Express error middleware
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
        // Create auth middleware
        if (authMetadata.strategy) {
          const authMiddleware = authMiddlewareFactory.createAuthMiddleware(
            authMetadata.strategy
          );
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
        
        this.app[method.toLowerCase()](path, ...middlewares, async (req: Request, res: Response) => {
          try {
            let result;
            
            if (route.io) {
              const input = route.io.from(req);
              result = await route.handler(input);
              route.io.to(result, res);
            } else {
              result = await route.handler(req, res);
              if (result !== undefined) {
                res.json(result);
              }
            }
          } catch (error) {
            if ((route as any).errorHandler) {
              (route as any).errorHandler.handler(error, req, res);
            } else {
              res.status(500).json({ error: (error as Error).message });
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

    // Validation middleware
    if (options.validation) {
      const validationMiddleware = this.createValidationMiddleware(options.validation);
      middlewares.push(validationMiddleware);
    }

    // Custom middlewares
    if (options.middlewares?.pre) {
      middlewares.push(...options.middlewares.pre);
    }

    return middlewares;
  }

  // Create validation middleware
  private createValidationMiddleware(validation: any): any {
    return (req: Request, res: Response, next: any) => {
      try {
        if (validation.request?.schema) {
          const { error } = validation.request.schema.validate(req.body);
          if (error) {
            return res.status(400).json({
              error: 'Validation Error',
              message: error.details.map((detail: any) => detail.message)
            });
          }
        }
        next();
      } catch (error) {
        next(error);
      }
    };
  }
}
