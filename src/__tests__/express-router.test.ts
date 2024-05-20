import * as Soap from "@soapjs/soap";
import { Express, Router } from "express";
import { ExpressRouter } from "../express-router";

describe("ExpressRouter", () => {
  let app: Partial<Express>;
  let container: any;
  let config: Soap.Config;
  let registry: Soap.MiddlewareRegistry;

  beforeEach(() => {
    app = {
      use: jest.fn(),
    };
    container = {};
    config = {} as Soap.Config;
    registry = new Map();
  });

  describe("constructor", () => {
    it("should create an instance with version", () => {
      const router = new ExpressRouter("1");
      expect(router).toBeInstanceOf(ExpressRouter);
      expect(router["versionPath"]).toBe("/v1");
    });

    it("should create an instance without version", () => {
      const router = new ExpressRouter();
      expect(router).toBeInstanceOf(ExpressRouter);
      expect(router["versionPath"]).toBe("");
    });
  });

  describe("initialize", () => {
    it("should initialize the router with required components", () => {
      const router = new ExpressRouter();
      router.initialize(container, config, app as Express, registry);

      expect(router["container"]).toBe(container);
      expect(router["config"]).toBe(config);
      expect(router["registry"]).toBe(registry);
      expect(router["router"]).not.toBeNull();
      expect(app.use).toHaveBeenCalledWith("/", router["router"]);
    });

    it("should initialize the router with version path", () => {
      const router = new ExpressRouter("1");
      router.initialize(container, config, app as Express, registry);

      expect(app.use).toHaveBeenCalledWith("/v1", router["router"]);
    });
  });

  describe("mountRoute", () => {
    let router: ExpressRouter;
    let route: Soap.Route;

    beforeEach(() => {
      router = new ExpressRouter();
      router.initialize(container, config, app as Express, registry);

      route = {
        method: "get",
        path: "/test",
        handler: jest.fn(),
        options: {
          cors: true,
          compression: true,
          rateLimit: true,
          session: true,
          security: true,
          validation: true,
          restrictions: {
            authenticatedOnly: true,
            authorizedOnly: true,
            nonAuthenticatedOnly: true,
            selfOnly: true,
          },
          middlewares: [jest.fn(), jest.fn()],
        },
      } as unknown as Soap.Route;
    });

    it("should throw UnsupportedHttpMethodError for unsupported method", () => {
      (route as any).method = "unsupportedMethod" as any;
      expect(() => router["mountRoute"](route)).toThrow(
        Soap.UnsupportedHttpMethodError
      );
    });

    it("should throw InvalidRoutePathError for invalid path", () => {
      (route as any).path = {} as any;
      expect(() => router["mountRoute"](route)).toThrow(
        Soap.InvalidRoutePathError
      );
    });

    it("should mount a route with middlewares", () => {
      registry.set(
        "cors",
        jest.fn(() => jest.fn())
      );
      registry.set(
        "compression",
        jest.fn(() => jest.fn())
      );
      registry.set(
        "rate_limit",
        jest.fn(() => jest.fn())
      );
      registry.set(
        "session",
        jest.fn(() => jest.fn())
      );
      registry.set(
        "security",
        jest.fn(() => jest.fn())
      );
      registry.set(
        "validation",
        jest.fn(() => jest.fn())
      );
      registry.set(
        "authenticated_only",
        jest.fn(() => jest.fn())
      );
      registry.set(
        "authorized_only",
        jest.fn(() => jest.fn())
      );
      registry.set(
        "non_authenticated_only",
        jest.fn(() => jest.fn())
      );
      registry.set(
        "self_only",
        jest.fn(() => jest.fn())
      );

      const spyRouterMethod = jest.spyOn(router["router"], "get");
      router["mountRoute"](route);

      expect(spyRouterMethod).toHaveBeenCalled();
    });
  });

  describe("mount", () => {
    let router: ExpressRouter;
    let singleRoute: Soap.Route;
    let multipleRoutes: Soap.Route[];

    beforeEach(() => {
      router = new ExpressRouter();
      router.initialize(container, config, app as Express, registry);

      singleRoute = {
        method: "get",
        path: "/test",
        handler: jest.fn(),
      } as unknown as Soap.Route;

      multipleRoutes = [
        {
          method: "get",
          path: "/test1",
          handler: jest.fn(),
        },
        {
          method: "post",
          path: "/test2",
          handler: jest.fn(),
        },
      ] as unknown as Soap.Route[];
    });

    it("should mount a single route", () => {
      const spyMountRoute = jest.spyOn(router as any, "mountRoute");
      router.mount(singleRoute);

      expect(spyMountRoute).toHaveBeenCalledWith(singleRoute);
    });

    it("should mount multiple routes", () => {
      const spyMountRoute = jest.spyOn(router as any, "mountRoute");
      router.mount(multipleRoutes);

      multipleRoutes.forEach((route) => {
        expect(spyMountRoute).toHaveBeenCalledWith(route);
      });
    });
  });

  describe("setupRoutes", () => {
    it("should throw NotImplementedError", () => {
      const router = new ExpressRouter();
      expect(() => router.setupRoutes()).toThrow(Soap.NotImplementedError);
    });
  });
});
