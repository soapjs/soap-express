import * as Soap from "@soapjs/soap";
import { CorsOptions } from "cors";
import { OptionsJson, OptionsUrlencoded } from "body-parser";
import * as RateLimit from "express-rate-limit";
import { HelmetOptions } from "helmet";
import { LoggerOptions } from "winston";
import { CompressionOptions } from "compression";
import { Options as SessionOptions } from "express-session";

/**
 * Express configuration object type.
 *
 * @typedef {Object} ExpressConfig
 * @extends {Soap.ApiConfig}
 * @property {OptionsJson} [json] - Optional configuration for JSON parsing middleware.
 * @property {OptionsUrlencoded} [urlencoded] - Optional configuration for URL-encoded parsing middleware.
 * @property {CorsOptions} [cors] - Optional configuration for Cross-Origin Resource Sharing (CORS).
 * @property {rateLimit.Options} [rateLimit] - Optional configuration for rate limiting.
 * @property {HelmetOptions} [security] - Optional security configuration using Helmet.
 * @property {CompressionOptions} [compression] - Optional configuration for response compression.
 * @property {SessionOptions} [session] - Optional configuration for session management.
 */
export type ExpressConfig = Soap.ApiConfig & {
  json?: OptionsJson;
  urlencoded?: OptionsUrlencoded;
  cors?: CorsOptions;
  rateLimit?: RateLimit.Options;
  security?: HelmetOptions;
  compression?: CompressionOptions;
  session?: SessionOptions;
};

/**
 * Express application configuration object type.
 *
 * @typedef {Object} ExpressAppConfig
 * @template A - Type of the API configuration. Defaults to ExpressConfig.
 * @template S - Type of the WebSocket configuration.
 * @template E - Type of the Event configuration.
 * @template T - Type of the Logger configuration. Defaults to LoggerOptions.
 * @property {A} [api] - Optional API configuration.
 * @property {S} [socket] - Optional WebSocket configuration.
 * @property {E} [event] - Optional Event configuration.
 * @property {T} [logger] - Optional Logger configuration or instance.
 * @property {Object.<string, any>} [key: string] - Additional properties.
 */
export type ExpressAppConfig = Soap.Config<
  ExpressConfig,
  unknown,
  unknown,
  LoggerOptions
>;
