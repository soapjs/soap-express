import * as Soap from "@soapjs/soap";
import { Express } from "express";
import passport from "passport";
import Ajv from "ajv";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { SoapAuthManager } from "./auth/soap-auth-manager";
import { AuthValidators } from "./auth/types";

export abstract class SoapExpressRouter<ContainerType> implements Soap.Router {
  protected authManager: SoapAuthManager;

  constructor(
    protected framework: Express,
    protected container: ContainerType,
    protected config: Soap.Config,
    protected authValidators?: AuthValidators
  ) {
    this.authManager = new SoapAuthManager(authValidators);
  }

  protected createPipeline(options: Soap.RouteOptions): any[] {
    const pipeline = [];

    if (
      options.authorization &&
      Object.keys(options.authorization).length > 0
    ) {
      const { authenticator, type, ...rest } = options.authorization;
      if (authenticator === "passport") {
        pipeline.push(passport.authenticate(type, { session: false, ...rest }));
      }
    }

    if (options.validator && Object.keys(options.validator).length > 0) {
      const { validator, schema } = options.validator;
      if (validator === "ajv") {
        const validate = new Ajv().compile(schema);
        pipeline.push((req, res, next) => {
          if (!validate(req.body)) {
            return res.status(400).json(validate.errors);
          }
          next();
        });
      }
    }

    if (options.cors) {
      if (Object.keys(options.cors).length === 0) {
        pipeline.push(cors({ origin: "*" }));
      } else {
        pipeline.push(cors(options.cors));
      }
    }

    if (options.limiter && Object.keys(options.limiter).length > 0) {
      const { maxRequests, ...rest } = options.limiter;
      const rlo = maxRequests ? { limit: maxRequests, ...rest } : { ...rest };
      pipeline.push(rateLimit(rlo));
    }

    if (Array.isArray(options?.middlewares)) {
      pipeline.push(...options.middlewares);
    }

    return pipeline;
  }

  protected mountRoute(route: Soap.Route) {
    const method = route.method.toLowerCase();

    if (route.options.authorization) {
      this.authManager.initializeAuthStrategy(route.options.authorization);
    }

    if (this.framework[method]) {
      const pipeline = this.createPipeline(route.options);

      if (Array.isArray(route.path)) {
        route.path.forEach((path) => {
          this.framework[method](path, ...pipeline, route.handler);
        });
      } else {
        this.framework[method](<string>route.path, ...pipeline);
      }
    } else {
      throw new Error(`Method ${method} not defined`);
    }
  }

  public mount(data: Soap.Route | Soap.Route[]) {
    if (Array.isArray(data)) {
      data.forEach((route) => this.mountRoute(route));
    } else {
      this.mountRoute(data);
    }
  }

  public abstract configure(...args: unknown[]);
}
