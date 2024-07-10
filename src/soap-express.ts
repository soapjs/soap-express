import { session } from "express-session";
import * as Soap from "@soapjs/soap";
import * as http from "http";
import express, * as e from "express";
import expressListEndpoints from "express-list-endpoints";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import { ExpressRouter } from "./express-router";
import { ExpressMiddleware } from "./express-middleware";

export class SoapExpress {
  /**
   * Bootstraps the Express application with the provided configuration, dependencies, router, and options.
   *
   * @param {Soap.ApiConfig} config - The API configuration.
   * @param {Soap.Dependencies} dependencies - The application dependencies.
   * @param {ExpressRouter} router - The Express router.
   * @param {Object} [options] - Optional configurations.
   * @param {Soap.AuthModule} [options.auth] - Optional authentication module.
   * @param {Soap.Logger} [options.logger] - Optional logger.
   * @param {Soap.AnyFunction[]} [options.middlewares] - Optional middlewares.
   * @param {Soap.ErrorHandler} [options.errorHandler] - Optional error handler.
   * @param {Soap.ErrorHandler} [options.httpErrorHandler] - Optional HTTP error handler.
   * @returns {Promise<{ app: e.Express, httpServer: http.Server, middlewares: Soap.MiddlewareRegistry }>} The Express app, HTTP server, and middleware registry.
   */
  static async bootstrap(
    config: Soap.ApiConfig,
    dependencies: Soap.Dependencies,
    router: ExpressRouter,
    options?: {
      auth?: Soap.ApiAuthModule;
      logger?: Soap.Logger;
      middlewares?: Soap.AnyFunction[];
      errorHandler?: Soap.ErrorHandler;
      httpErrorHandler?: Soap.ErrorHandler;
      [key: string]: unknown;
    }
  ): Promise<{
    app: e.Express;
    httpServer: http.Server;
    middlewares: Soap.MiddlewareRegistry;
  }> {
    let _logger: Soap.Logger = options?.logger || new Soap.ConsoleLogger();
    let _defaultErrorHandler = (err: Error) => _logger.error(err);
    let _errorHandler: Soap.ErrorHandler =
      options?.errorHandler || _defaultErrorHandler;

    try {
      await dependencies.configure(config);

      const middlewares = new Soap.MiddlewareRegistry(_logger);
      const app = express();

      app.use(express.json(config?.json));

      if (config?.urlencoded) {
        app.use(express.urlencoded(config.urlencoded));
      }

      if (config?.cors) {
        app.use(cors(config.cors));
        middlewares.add(
          new ExpressMiddleware(Soap.MiddlewareType.Cors, true, null, cors)
        );
      }

      if (config?.security) {
        app.use(helmet(config.security));
        middlewares.add(
          new ExpressMiddleware(
            Soap.MiddlewareType.Security,
            true,
            null,
            helmet
          )
        );
      }

      if (config?.rateLimit) {
        app.use(rateLimit(config.rateLimit));
        middlewares.add(
          new ExpressMiddleware(
            Soap.MiddlewareType.RateLimit,
            true,
            null,
            rateLimit
          )
        );
      }

      if (config?.compression) {
        app.use(compression(config.compression));
        middlewares.add(
          new ExpressMiddleware(
            Soap.MiddlewareType.Compression,
            true,
            null,
            compression
          )
        );
      }

      if (config?.session) {
        app.use(session(config.session));
        middlewares.add(
          new ExpressMiddleware(
            Soap.MiddlewareType.Session,
            true,
            null,
            session
          )
        );
      }

      if (config?.auth && options?.auth) {
        const strategies = Object.keys(config.auth);
        for (const name of strategies) {
          const strategy = options.auth.getStrategy(name);
          if (strategy) {
            strategy.init();
            middlewares.add(
              strategy.middlewares.getMiddlewares({
                onlyGlobal: true,
              }),
              true
            );
          }
        }
      }

      if (options?.middlewares) {
        options.middlewares.forEach((middleware) => app.use(middleware));
      }

      router.initialize(app, middlewares);
      router.setupRoutes();

      if (options?.httpErrorHandler) {
        app.use((err, req, res, next) => {
          if (err instanceof Soap.HttpError) {
            options.httpErrorHandler(err, req, res, next);
          } else {
            next(err);
          }
        });
      }

      app.use((err, req, res, next) => {
        _errorHandler(err, req, res, next);
      });

      const port = config.port || 3000;

      const httpServer = app.listen(port, () => {
        if (!config.port) {
          _logger.info(`No port specified, using default 3000`);
        }

        _logger.info(`Server is running on port ${port}`);

        this.printEndpoints(app);
      });

      return {
        app,
        httpServer,
        middlewares,
      };
    } catch (error) {
      _errorHandler(error);
    }
  }

  private static printEndpoints(app: e.Express) {
    const endpoints = expressListEndpoints(app);
    endpoints.forEach((endpoint) => {
      console.log(
        `${endpoint.methods[0]} ${
          endpoint.path
        } with middlewares: [${endpoint.middlewares.join(",")}]`
      );
    });
  }
}
