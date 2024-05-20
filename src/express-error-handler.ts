import * as Soap from "@soapjs/soap";
import { NextFunction, Request, Response } from "express";

/**
 * Handles HTTP errors and responds with appropriate status codes and messages.
 *
 * @param {Soap.HttpError} error - The HTTP error object.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function.
 */
export const httpErrorHandler = (
  error: Soap.HttpError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(`[HTTP ERROR] ${error.message}`, error);

  if (res.headersSent) {
    return next(error);
  }

  switch (error.status) {
    case 400:
      res.status(400).json({ message: "Bad Request", details: error.message });
      break;
    case 401:
      res.status(401).json({ message: "Unauthorized", details: error.message });
      break;
    case 403:
      res.status(403).json({ message: "Forbidden", details: error.message });
      break;
    case 404:
      res.status(404).json({ message: "Not Found", details: error.message });
      break;
    case 409:
      res.status(409).json({ message: "Conflict", details: error.message });
      break;
    case 422:
      res
        .status(422)
        .json({ message: "Unprocessable Entity", details: error.message });
      break;
    case 500:
      res
        .status(500)
        .json({ message: "Internal Server Error", details: error.message });
      break;
    default:
      res.status(error.status || 500).json({
        message: "An unexpected error occurred",
        details: error.message,
      });
      break;
  }
};

/**
 * Handles generic system errors and responds with a 500 status code.
 *
 * @param {Error} error - The error object.
 * @param {Request} [req] - The Express request object (optional).
 * @param {Response} [res] - The Express response object (optional).
 * @param {NextFunction} [next] - The next middleware function (optional).
 */
export const errorHandler = (
  error: Error,
  req?: Request,
  res?: Response,
  next?: NextFunction
) => {
  console.error(`[SYSTEM ERROR] ${error.message}`, error);

  if (res && res.headersSent) {
    return next && next(error);
  }

  const statusCode = 500;
  const response = {
    message: "An unexpected error occurred",
    details: error.message,
  };

  if (res) {
    res.status(statusCode).json(response);
  } else {
    console.error(
      `[SYSTEM ERROR] No response object available: ${error.message}`
    );
  }
};
