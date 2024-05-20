import { Request, Response, NextFunction } from "express";
import { httpErrorHandler, errorHandler } from "../express-error-handler";
import * as Soap from "@soapjs/soap";

describe("Error Handlers", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      headersSent: false,
    };
    next = jest.fn();
  });

  describe("httpErrorHandler", () => {
    it("should handle 400 Bad Request", () => {
      const error = new Soap.HttpError(400, "Bad Request Error");
      httpErrorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Bad Request",
        details: "[400] Bad Request Error",
      });
    });

    it("should handle 401 Unauthorized", () => {
      const error = new Soap.HttpError(401, "Unauthorized Error");
      httpErrorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Unauthorized",
        details: "[401] Unauthorized Error",
      });
    });

    it("should handle 500 Internal Server Error", () => {
      const error = new Soap.HttpError(500, "Internal Server Error");
      httpErrorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Internal Server Error",
        details: "[500] Internal Server Error",
      });
    });

    it("should call next if headers are sent", () => {
      res.headersSent = true;
      const error = new Soap.HttpError(400, "Bad Request Error");
      httpErrorHandler(error, req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("errorHandler", () => {
    it("should handle generic errors", () => {
      const error = new Error("Generic Error");
      errorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "An unexpected error occurred",
        details: "Generic Error",
      });
    });

    it("should call next if headers are sent", () => {
      res.headersSent = true;
      const error = new Error("Generic Error");
      errorHandler(error, req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it("should log error if response object is not available", () => {
      console.error = jest.fn();
      const error = new Error("Generic Error");
      errorHandler(error);

      expect(console.error).toHaveBeenCalledWith(
        `[SYSTEM ERROR] ${error.message}`,
        error
      );
    });
  });
});
