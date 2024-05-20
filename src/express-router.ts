import * as Soap from "@soapjs/soap";
import { Express, Router } from "express";
import { ExpressRouteHandler } from "./express-route-handler";

/**
 * Represents an Express router with versioning and middleware support.
 * @template ContainerType - The type of the dependency injection container.
 */
export class ExpressRouter<ContainerType = any> extends Soap.Router {
  protected container: ContainerType;
  protected config: Soap.Config;
  protected registry: Soap.MiddlewareRegistry;
  protected router: Router;

  /**
   * Constructs a new SoapExpressRouter.
   * @param {string} [version] - Optional version prefix for the router.
   */
  constructor(version?: string) {
    super(version);
  }

  /**
   * Mounts a single route with optional middleware.
   * @param {Soap.Route} route - The route to mount.
   * @throws {Soap.UnsupportedHttpMethodError} If the HTTP method is not supported.
   * @throws {Soap.InvalidRoutePathError} If the route path is invalid.
   */
  protected mountRoute(route: Soap.Route) {
    const { registry } = this;
    const { options } = route;
    const middlewares = [];
    const method = route.method.toLowerCase();
    // TODO: refactor
    const routeHandler = ExpressRouteHandler.create(route);
    const handlerTrigger = routeHandler.exec.bind(routeHandler);

    if (!this.router[method]) {
      throw new Soap.UnsupportedHttpMethodError(method);
    }

    if (options?.cors && registry.has("cors")) {
      middlewares.push(registry.get("cors")(options?.cors));
    }

    if (options?.compression && registry.has("compression")) {
      middlewares.push(registry.get("compression")(options?.compression));
    }

    if (options?.rateLimit && registry.has("rate_limit")) {
      middlewares.push(registry.get("rate_limit")(options?.rateLimit));
    }

    if (options?.session && registry.has("session")) {
      middlewares.push(registry.get("session")(options?.session));
    }

    if (options?.security && registry.has("security")) {
      middlewares.push(registry.get("security")(options?.security));
    }

    if (options?.validation && registry.has("validation")) {
      middlewares.push(registry.get("validation")(options?.validation));
    }

    if (
      options?.restrictions?.authenticatedOnly &&
      registry.has("authenticated_only")
    ) {
      middlewares.push(registry.get("authenticated_only")());
    }

    if (
      options?.restrictions?.authorizedOnly &&
      registry.has("authorized_only")
    ) {
      middlewares.push(registry.get("authorized_only")());
    }

    if (
      options?.restrictions?.nonAuthenticatedOnly &&
      registry.has("non_authenticated_only")
    ) {
      middlewares.push(registry.get("non_authenticated_only")());
    }

    if (options?.restrictions?.selfOnly && registry.has("self_only")) {
      middlewares.push(registry.get("self_only")());
    }

    if (Array.isArray(options?.middlewares)) {
      middlewares.push(...options.middlewares);
    }

    if (Array.isArray(route.path)) {
      route.path.forEach((path) => {
        this.router[method](path, middlewares, handlerTrigger);
      });
    } else if (typeof route.path === "string") {
      this.router[method](route.path, middlewares, handlerTrigger);
    } else {
      throw new Soap.InvalidRoutePathError(route.path);
    }
  }

  /**
   * Initializes the router with required components.
   * @param {ContainerType} container - The dependency injection container.
   * @param {Soap.Config} config - The application configuration.
   * @param {Express} app - The Express application instance.
   * @param {Soap.MiddlewareRegistry} registry - The middleware registry.
   */
  public initialize(
    container: ContainerType,
    config: Soap.Config,
    app: Express,
    registry: Soap.MiddlewareRegistry
  ) {
    this.container = container;
    this.config = config;
    this.registry = registry;
    this.router = Router();
    const routeRoot = this.versionPath || "/";
    app.use(routeRoot, this.router);
  }

  public mount(data: Soap.Route | Soap.Route[]) {
    if (Array.isArray(data)) {
      data.forEach((route) => this.mountRoute(route));
    } else {
      this.mountRoute(data);
    }
  }

  public setupRoutes() {
    throw new Soap.NotImplementedError("setupRoutes");
  }
}
