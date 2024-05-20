import * as http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import { session } from "express-session";
import { SoapExpress } from "../soap-express";
import { ExpressRouter } from "../express-router";
import * as Soap from "@soapjs/soap";

jest.mock("express", () => {
  const express = jest.requireActual("express");
  express.json = jest.fn(() => (req, res, next) => next());
  express.urlencoded = jest.fn(() => (req, res, next) => next());
  express.static = jest.fn(() => (req, res, next) => next());
  const mockExpress = () => ({
    use: jest.fn(),
    listen: jest.fn().mockImplementation((port, callback) => {
      callback();
      return {
        close: jest.fn(),
      };
    }),
  });
  mockExpress.json = express.json;
  mockExpress.urlencoded = express.urlencoded;
  mockExpress.static = express.static;
  return mockExpress;
});
jest.mock("cors");
jest.mock("helmet");
jest.mock("express-rate-limit");
jest.mock("compression");
jest.mock("express-session", () => {
  const session = jest.fn(() => (req, res, next) => next());
  return { session };
});

describe("SoapExpress", () => {
  let config: Soap.ApiConfig;
  let dependencies: Soap.Dependencies;
  let router: ExpressRouter;
  let app: express.Express;
  let httpServer: http.Server;

  beforeEach(() => {
    config = {
      port: 3000,
    } as Soap.ApiConfig;

    dependencies = {
      configure: jest.fn().mockResolvedValue(undefined),
      container: {},
    } as unknown as Soap.Dependencies;

    router = {
      initialize: jest.fn(),
      setupRoutes: jest.fn(),
    } as unknown as ExpressRouter;

    app = express();
    httpServer = {
      listen: jest.fn().mockImplementation((port, callback) => {
        callback();
        return {
          close: jest.fn(),
        };
      }),
    } as unknown as http.Server;

    jest.spyOn(app, "listen").mockImplementation((port, callback) => {
      if (callback) callback();
      return httpServer;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("bootstrap", () => {
    it("should bootstrap the application with required components", async () => {
      const result = await SoapExpress.bootstrap(config, dependencies, router);

      expect(dependencies.configure).toHaveBeenCalledWith(config);
      expect(express.json).toHaveBeenCalledWith(config.json);
      expect(router.initialize).toHaveBeenCalledWith(
        dependencies.container,
        config,
        expect.any(Object),
        expect.any(Soap.MiddlewareRegistry)
      );
      expect(router.setupRoutes).toHaveBeenCalled();
      expect(result.app).toBeInstanceOf(Object);
      expect(result.httpServer).toBeInstanceOf(Object);
      expect(result.middlewares).toBeInstanceOf(Soap.MiddlewareRegistry);
    });

    it("should use optional middlewares if provided", async () => {
      config.cors = {};
      config.security = {};
      config.rateLimit = {};
      config.compression = {};
      config.session = {};

      const result = await SoapExpress.bootstrap(config, dependencies, router);

      expect(cors).toHaveBeenCalledWith(config.cors);
      expect(helmet).toHaveBeenCalledWith(config.security);
      expect(rateLimit).toHaveBeenCalledWith(config.rateLimit);
      expect(compression).toHaveBeenCalledWith(config.compression);
      expect(session).toHaveBeenCalledWith(config.session);
      expect(result.middlewares.get("cors")).toBe(cors);
      expect(result.middlewares.get("security")).toBe(helmet);
      expect(result.middlewares.get("rate_limit")).toBe(rateLimit);
      expect(result.middlewares.get("compression")).toBe(compression);
      expect(result.middlewares.get("session")).toBe(session);
    });

    it("should initialize auth strategies if provided", async () => {
      const authStrategy = {
        initialize: jest.fn(),
      };
      const authModule = {
        strategies: [authStrategy],
      } as unknown as Soap.AuthModule;

      await SoapExpress.bootstrap(config, dependencies, router, {
        auth: authModule,
      });

      expect(authStrategy.initialize).toHaveBeenCalledWith(expect.any(Object));
    });

    it("should use custom error handlers if provided", async () => {
      const error = new Error("test error");
      const customErrorHandler = jest.fn();
      const customHttpErrorHandler = jest.fn();
      (dependencies.configure as any).mockImplementationOnce(() => {
        throw error;
      });
      await SoapExpress.bootstrap(config, dependencies, router, {
        errorHandler: customErrorHandler,
        httpErrorHandler: customHttpErrorHandler,
      });

      expect(customErrorHandler).toHaveBeenCalledWith(error);
    });
  });
});
