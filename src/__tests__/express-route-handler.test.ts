import { Request, Response, NextFunction } from "express";
import { ExpressRouteHandler } from "../express-route-handler";
import * as Soap from "@soapjs/soap";

describe("ExpressRouteHandler", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    next = jest.fn();
  });

  describe("create", () => {
    it("should create an instance of ExpressRouteHandler", () => {
      const route = {
        handler: jest.fn(),
        options: {
          io: {
            fromRequest: jest.fn(),
            toResponse: jest.fn(),
          },
        },
      } as unknown as Soap.Route;
      const handler = ExpressRouteHandler.create(route);
      expect(handler).toBeInstanceOf(ExpressRouteHandler);
    });
  });

  describe("exec", () => {
    it("should handle a request and send a response", async () => {
      const mockResult = Soap.Result.withContent("Success");
      const handler = jest.fn().mockResolvedValue(mockResult);
      const io = {
        fromRequest: jest.fn().mockReturnValue({}),
        toResponse: jest.fn(),
      };
      io.toResponse.mockImplementation(() => {
        res.status(200).send("Success");
      });
      const expressHandler = new ExpressRouteHandler(handler, io);
      await expressHandler.exec(req as Request, res as Response, next);

      expect(handler).toHaveBeenCalledWith({});
      expect(io.toResponse).toHaveBeenCalledWith(res, mockResult);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith("Success");
    });

    it("should call next with an error if handler throws", async () => {
      const error = new Error("Handler error");
      const handler = jest.fn().mockRejectedValue(error);
      const expressHandler = new ExpressRouteHandler(handler, undefined);
      await expressHandler.exec(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it("should call next with a failure error if result is failure", async () => {
      const error = new Error("Failure error");
      const mockResult = Soap.Result.withFailure(error);
      const handler = jest.fn().mockResolvedValue(mockResult);

      const expressHandler = new ExpressRouteHandler(handler, undefined);
      await expressHandler.exec(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it("should send OK if result content is undefined", async () => {
      const mockResult = Soap.Result.withoutContent();
      const handler = jest.fn().mockResolvedValue(mockResult);

      const expressHandler = new ExpressRouteHandler(handler, undefined);
      await expressHandler.exec(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith("OK");
    });
  });
});
