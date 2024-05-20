import * as Soap from "@soapjs/soap";
import { CorsOptions } from "cors";
import { OptionsJson, OptionsUrlencoded } from "body-parser";
import * as RateLimit from "express-rate-limit";
import { HelmetOptions } from "helmet";
import { LoggerOptions } from "winston";
import { CompressionOptions } from "compression";
import { Options as SessionOptions } from "express-session";

export interface ExpressAppConfig extends Soap.Config {
  api: {
    host?: string;
    json?: OptionsJson;
    urlencoded?: OptionsUrlencoded;
    cors?: CorsOptions;
    rateLimit?: RateLimit.Options;
    security?: HelmetOptions;
    compression?: CompressionOptions;
    session?: SessionOptions;
  };
  logger?: LoggerOptions;
  auth?: any;
}
