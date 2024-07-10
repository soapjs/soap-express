import * as Soap from "@soapjs/soap";
import { Express, Router } from "express";
import { ExpressRouter } from "../express-router";

class ExpressRouterImpl extends ExpressRouter {
  public setupRoutes(...args: unknown[]) {
    throw new Error("Method not implemented.");
  }
}

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
    registry = new Soap.MiddlewareRegistry(console as unknown as Soap.Logger);
  });

  describe("constructor", () => {
    it("should create an instance with version", () => {
      const router = new ExpressRouterImpl("api", "v1");
      expect(router).toBeInstanceOf(ExpressRouterImpl);
      expect(router["prefix"]).toBe("api");
      expect(router["version"]).toBe("v1");
    });

    it("should create an instance without version", () => {
      const router = new ExpressRouterImpl(null, null);
      expect(router).toBeInstanceOf(ExpressRouterImpl);
      expect(router["prefix"]).toBeFalsy();
      expect(router["version"]).toBeFalsy();
    });
  });

  describe("initialize", () => {
    it("should initialize the router with required components", () => {
      const router = new ExpressRouterImpl(null, null);
      router.initialize(app as Express, registry);

      expect(router["registry"]).toBe(registry);
      expect(router["router"]).not.toBeNull();
      expect(app.use).toHaveBeenCalledWith("/", router["router"]);
    });

    it("should initialize the router with version path", () => {
      const router = new ExpressRouterImpl("api", "v1");
      router.initialize(app as Express, registry);

      expect(app.use).toHaveBeenCalledWith("/api/v1", router["router"]);
    });
  });

  describe("mountRoute", () => {
    let router: ExpressRouter;
    let route: Soap.Route;

    beforeEach(() => {
      router = new ExpressRouterImpl(null, null);
      router.initialize(app as Express, registry);

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
  });

  describe("mount", () => {
    let router: ExpressRouter;
    let singleRoute: Soap.Route;
    let multipleRoutes: Soap.Route[];

    beforeEach(() => {
      router = new ExpressRouterImpl(null, null);
      router.initialize(app as Express, registry);

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
      const router = new ExpressRouterImpl(null, null);
      expect(() => router.setupRoutes()).toThrow(Error);
    });
  });
});

describe("createRootPath", () => {
  it("should create root path with prefix and version", () => {
    const rootPath = new ExpressRouterImpl(null, null)["createRootPath"](
      "api",
      "v1"
    );
    expect(rootPath).toBe("/api/v1");
  });

  it("should create root path with only prefix", () => {
    const rootPath = new ExpressRouterImpl(null, null)["createRootPath"]("api");
    expect(rootPath).toBe("/api");
  });

  it("should create root path with only version", () => {
    const rootPath = new ExpressRouterImpl(null, null)["createRootPath"](
      undefined,
      "v1"
    );
    expect(rootPath).toBe("/v1");
  });

  it("should create root path with no prefix and version", () => {
    const rootPath = new ExpressRouterImpl(null, null)["createRootPath"]();
    expect(rootPath).toBe("/");
  });

  it("should handle leading and trailing slashes in prefix", () => {
    const rootPath = new ExpressRouterImpl(null, null)["createRootPath"](
      "/api/",
      "v1"
    );
    expect(rootPath).toBe("/api/v1");
  });

  it("should handle leading and trailing slashes in version", () => {
    const rootPath = new ExpressRouterImpl(null, null)["createRootPath"](
      "api",
      "/v1/"
    );
    expect(rootPath).toBe("/api/v1");
  });

  it("should handle leading and trailing slashes in both prefix and version", () => {
    const rootPath = new ExpressRouterImpl(null, null)["createRootPath"](
      "//api//",
      "/v1//"
    );
    expect(rootPath).toBe("/api/v1");
  });

  it("should handle only slashes in prefix and version", () => {
    const rootPath = new ExpressRouterImpl(null, null)["createRootPath"](
      "///",
      "///"
    );
    expect(rootPath).toBe("/");
  });

  it("should handle empty strings", () => {
    const rootPath = new ExpressRouterImpl(null, null)["createRootPath"](
      "",
      ""
    );
    expect(rootPath).toBe("/");
  });
});
