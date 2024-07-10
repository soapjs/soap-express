import * as Soap from "@soapjs/soap";
import { Express, Router, Request, Response, NextFunction } from "express";
import { ExpressRouteHandler } from "./express-route-handler";
import { ExpressMiddleware } from "./express-middleware";

/**
 * Represents an Express router with versioning and middleware support.
 * @template ContainerType - The type of the dependency injection container.
 */
export abstract class ExpressRouter implements Soap.Router {
  protected registry: Soap.MiddlewareRegistry;
  protected router: Router;

  /**
   * Constructs a new SoapExpressRouter.
   * @param {string | null} [prefix] - Optional api prefix - like "api" - for the router.
   * @param {string | null} [version] - Optional version - like "v1" - for the router.
   */
  constructor(
    public readonly prefix: string | null,
    public readonly version: string | null
  ) {}

  protected setupMiddleware(
    middlewares: Soap.AnyFunction[],
    name: string,
    options?: unknown
  ) {
    if (this.registry.has(name) === false) {
      return;
    }

    if (this.registry.isReady(name) === false) {
      this.registry.init(name, options);
    }

    middlewares.push(this.registry.get(name).use(options));
  }

  /**
   * Mounts a single route with optional middleware.
   * @param {Soap.Route} route - The route to mount.
   * @throws {Soap.UnsupportedHttpMethodError} If the HTTP method is not supported.
   * @throws {Soap.InvalidRoutePathError} If the route path is invalid.
   */
  protected mountRoute(route: Soap.Route) {
    const { options } = route;
    const middlewares = [];
    const method = route.method.toLowerCase();

    if (!this.router[method]) {
      throw new Soap.UnsupportedHttpMethodError(method);
    }

    this.setupMiddleware(middlewares, Soap.MiddlewareType.Cors, options?.cors);
    this.setupMiddleware(
      middlewares,
      Soap.MiddlewareType.Compression,
      options?.compression
    );
    this.setupMiddleware(
      middlewares,
      Soap.MiddlewareType.RateLimit,
      options?.rateLimit
    );
    this.setupMiddleware(
      middlewares,
      Soap.MiddlewareType.Session,
      options?.session
    );
    this.setupMiddleware(
      middlewares,
      Soap.MiddlewareType.Security,
      options?.security
    );
    this.setupMiddleware(
      middlewares,
      Soap.MiddlewareType.Validation,
      options?.validation
    );

    if (options?.restrictions?.authenticatedOnly) {
      this.setupMiddleware(middlewares, Soap.MiddlewareType.AuthenticatedOnly);
    }

    if (options?.restrictions?.authorizedOnly) {
      this.setupMiddleware(middlewares, Soap.MiddlewareType.AuthorizedOnly);
    }

    if (options?.restrictions?.nonAuthenticatedOnly) {
      this.setupMiddleware(
        middlewares,
        Soap.MiddlewareType.NonAuthenticatedOnly
      );
    }

    if (options?.restrictions?.selfOnly) {
      this.setupMiddleware(middlewares, Soap.MiddlewareType.SelfOnly);
    }

    if (Array.isArray(options?.middlewares)) {
      options.middlewares.forEach((middleware) => {
        if (ExpressMiddleware.isExpressMiddleware(middleware)) {
          middlewares.push(middleware.use());
        } else if (typeof middleware === "function") {
          middlewares.push(middleware);
        }
      });
    }

    if (Array.isArray(route.path)) {
      route.path.forEach((path) => {
        this.router[method](
          path,
          middlewares,
          (request: Request, response: Response, next: NextFunction) => {
            return ExpressRouteHandler.create(route).exec(
              request,
              response,
              next
            );
          }
        );
      });
    } else if (typeof route.path === "string") {
      this.router[method](
        route.path,
        middlewares,
        (request: Request, response: Response, next: NextFunction) => {
          return ExpressRouteHandler.create(route).exec(
            request,
            response,
            next
          );
        }
      );
    } else {
      throw new Soap.InvalidRoutePathError(route.path);
    }
  }

  /**
   * Creates a root path for the router, combining prefix and API version if provided.
   * Cleans up any extra slashes provided by the user.
   * @param {string} [prefix] - Optional prefix for the API routes (e.g., 'api').
   * @param {string} [version] - Optional API version (e.g., 'v1').
   * @returns {string} - The combined root path (e.g., '/api/v1').
   */
  protected createRootPath(prefix?: string, version?: string): string {
    const cleanedPrefix = prefix ? `/${prefix}` : "";
    const cleanedApiVersion = version ? `/${version}` : "";

    const rootPath = `${cleanedPrefix}${cleanedApiVersion}`.replace(
      /\/+/g,
      "/"
    );
    return rootPath.replace(/\/+$/g, "") || "/";
  }

  /**
   * Initializes the router with required components.
   * @param {Express} app - The Express application instance.
   * @param {Soap.MiddlewareRegistry} registry - The middleware registry.
   */
  public initialize(app: Express, registry: Soap.MiddlewareRegistry) {
    this.registry = registry;
    this.router = Router();
    const root = this.createRootPath(this.prefix, this.version);
    app.use(root, this.router);
  }

  /**
   * Mounts one or more routes.
   *
   * @param {Soap.Route | Soap.Route[]} data - A single route object or an array of route objects to be mounted.
   */
  public mount(data: Soap.Route | Soap.Route[]) {
    if (Array.isArray(data)) {
      data.forEach((route) => this.mountRoute(route));
    } else {
      this.mountRoute(data);
    }
  }

  /**
   * Abstract method to set up routes.
   * Subclasses must implement this method to define their own route setup logic or use it as a placeholder for CLI actions.
   *
   * @abstract
   * @param {...unknown} args - The arguments required for setting up routes.
   */
  public abstract setupRoutes(...args: unknown[]);
}
