import * as Soap from "@soapjs/soap";
import { Request } from "express";
import { ApiKeyValidator } from "./types";

export const setupApiKeyStrategy = (
  options: Soap.AuthOptions,
  validator: ApiKeyValidator
) => {
  return async (req: Request, done) => {
    let apiKey: string;

    if (!options.secretOrKey) {
      return done(null, false, { message: `"secretOrKey" is missing` });
    }

    if (options.apiKeyHeader && req.headers[options.apiKeyHeader]) {
      apiKey = req.headers[options.apiKeyHeader] as string;
    } else if (req.headers["x-api-key"]) {
      apiKey = req.headers["x-api-key"] as string;
    } else if (
      options.apiKeyQueryParam &&
      req.query[options.apiKeyQueryParam]
    ) {
      apiKey = req.query.apiKey as string;
    }

    if (!apiKey) {
      return done(null, false, { message: "API Key not provided" });
    }

    if (validator) {
      const result = await validator.validate(apiKey);

      if (result.isFailure) {
        return done(null, false, { message: result.failure.error.message });
      }
      return done(null, result.content);
    }

    if (!validator && !options.secretOrKey) {
      return done(null, false, {
        message: 'Missing API Key validator && "secretOrKey"',
      });
    }

    if (apiKey === options.secretOrKey) {
      return done(null, { apiKey });
    }

    return done(null, false, { message: "Invalid API Key" });
  };
};
