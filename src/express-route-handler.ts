/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Soap from "@soapjs/soap";
import { NextFunction, Request, Response } from "express";

/**
 * Class to handle Express routes using Soap route handlers.
 */
export class ExpressRouteHandler {
  /**
   * Creates an instance of ExpressRouteHandler from a Soap route.
   *
   * @param {Soap.Route} route - The Soap route object.
   * @returns {ExpressRouteHandler} A new instance of ExpressRouteHandler.
   */
  static create(route: Soap.Route) {
    return new ExpressRouteHandler(route.handler, route.options?.io);
  }

  /**
   * Constructs an ExpressRouteHandler.
   *
   * @param {Soap.AnyFunction<Soap.Result<any>>} handler - The handler function for the route.
   * @param {Soap.RouteIO} io - The input/output handlers for the route.
   */
  constructor(
    private handler: Soap.AnyFunction<Soap.Result<any>>,
    private io: Soap.RouteIO
  ) {}

  /**
   * Executes the route handler.
   *
   * @param {Request} request - The Express request object.
   * @param {Response} response - The Express response object.
   * @param {NextFunction} next - The next middleware function.
   */
  async exec(request: Request, response: Response, next: NextFunction) {
    const { handler, io } = this;
    try {
      let result;
      if (io?.fromRequest) {
        result = await handler(io.fromRequest(request));
      } else {
        result = await handler(request, response, next);
      }

      if (isResult(result)) {
        if (result.isFailure) {
          next(result.failure.error);
        }

        if (io?.toResponse) {
          io.toResponse(response, result);
        } else {
          response.status(200).send(result.content || "OK");
        }
      }
    } catch (error) {
      next(error);
    }
  }
}

const isResult = <T = any>(obj: any): obj is Soap.Result<T> => {
  return (
    typeof obj?.isFailure === "boolean" && typeof obj?.isSuccess === "boolean"
  );
};
