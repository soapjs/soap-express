import { SoapExpressApp } from './app';
import { SoapExpressOptions, CorsOptions, RateLimitOptions, LoggingOptions } from './types';
import { AuthStrategy } from './auth';
import { HttpPlugin } from '@soapjs/soap/http';
import { DIContainer, Logger } from '@soapjs/soap/common';
import { Drainable } from '@soapjs/soap/events';
import type { CqrsConfig } from './cqrs/wiring';

// ── Config ─────────────────────────────────────────────────────────────────

/**
 * Declarative configuration for {@link createApp} / {@link bootstrap}.
 *
 * Every field is optional — start with just `controllers` and add more as you
 * need it.
 */
export interface BootstrapConfig {
  /**
   * Controller classes (decorated with `@Controller`) to auto-register in DI
   * and mount on the Express router.
   *
   * @example
   * controllers: [UserController, ProductController]
   */
  controllers?: Array<new (...args: any[]) => any>;

  /**
   * An existing {@link DIContainer} whose bindings are merged into the app's
   * internal container before controllers are resolved.
   *
   * Use this when you wire up repositories, services, or config values before
   * calling `createApp`/`bootstrap`.
   *
   * Internal app bindings (e.g. `AuthMiddlewareFactory`) are never overwritten.
   *
   * @example
   * import { container } from '@soapjs/soap-express';
   * container.bindClass('UserRepo', UserRepository);
   * container.bindValue('Config', { jwtSecret: process.env.JWT_SECRET });
   *
   * await bootstrap({ container, controllers: [UserController] });
   */
  container?: DIContainer;

  /**
   * Global middleware applied before routes, in the recommended safe order:
   * Helmet → CORS → Rate-limit → Compression → Logging.
   */
  middleware?: {
    /**
     * Helmet security headers.
     * Enabled by default — pass `false` only if you manage headers yourself.
     * @default true
     */
    helmet?: boolean;

    /**
     * CORS.
     * `true` = permissive defaults (any origin, standard methods).
     * Pass {@link CorsOptions} to restrict origins, credentials, etc.
     */
    cors?: boolean | CorsOptions;

    /**
     * Rate limiting.
     * `true` = 100 requests per 15 minutes per IP.
     * Pass {@link RateLimitOptions} to override window/max/key.
     */
    rateLimit?: boolean | RateLimitOptions;

    /**
     * Gzip/deflate response compression.
     * @default false
     */
    compression?: boolean;

    /**
     * Request logging.
     * `true` = info-level logging to console.
     * Pass {@link LoggingOptions} to customise the log level/format.
     */
    logging?: boolean | LoggingOptions;

    /**
     * Extra Express middleware applied after compression and **before** logging
     * (tracing, request context, …). Wire adapters from your app, not from
     * soap-express.
     */
    pre?: Array<(req: any, res: any, next: any) => void>;

    /** Extra middleware applied after the logging middleware. */
    post?: Array<(req: any, res: any, next: any) => void>;
  };

  /**
   * One or more auth strategies to register.
   * Equivalent to calling `app.registerAuthStrategy(strategy)` for each entry.
   */
  auth?: AuthStrategy | AuthStrategy[];

  /**
   * Plugins to install before the server starts.
   *
   * @example
   * import { HealthCheckPlugin, PingPlugin } from '@soapjs/soap-express';
   *
   * plugins: [
   *   new HealthCheckPlugin(),
   *   { plugin: new MetricsPlugin(), options: { path: '/metrics' } },
   * ]
   */
  plugins?: Array<HttpPlugin | { plugin: HttpPlugin; options?: any }>;

  /**
   * Mount a lightweight liveness endpoint.
   * `true`  → `GET /health`
   * string → `GET /<path>`
   */
  healthCheck?: boolean | string;

  /**
   * Options forwarded to the {@link SoapExpressApp} constructor (error handler,
   * DI container passed at construction, etc.).
   */
  app?: SoapExpressOptions;

  /**
   * Enable CQRS wiring.
   *
   * `true` — auto-wire all handlers registered via `@CommandHandler` /
   * `@QueryHandler` decorators using `InMemoryCommandBus` / `InMemoryQueryBus`.
   *
   * Pass a {@link CqrsConfig} object to supply custom bus instances or override
   * the default DI tokens.
   *
   * The buses are bound in the container as `'CommandBus'` and `'QueryBus'`
   * (overridable via `commandBusToken` / `queryBusToken`).
   *
   * @example
   * // Auto-wire with defaults
   * await bootstrap({ controllers: [UserController], cqrs: true });
   *
   * // Custom bus tokens
   * await bootstrap({ cqrs: { commandBusToken: 'MyCommandBus' } });
   */
  cqrs?: boolean | CqrsConfig;

  /**
   * Logger port. Bound in the container under `Logger.Token`, used by the
   * logging middleware (per-request `req.log` with `requestId` context),
   * the error handler, and any service that resolves `Logger` out of DI.
   *
   * Default: a level-aware {@link ConsoleLogger} from `@soapjs/soap/common`
   * that emits JSON when stdout is not a TTY and respects the `LOG_LEVEL`
   * env var. Pass a Pino/Winston adapter to ship to your log infrastructure.
   */
  logger?: Logger;

  /**
   * External resources to drain on graceful shutdown (SIGTERM / SIGINT).
   *
   * Each entry is duck-typed via {@link Drainable} — `gracefulShutdown`,
   * `disconnect`, or `close` are accepted, picked in that order — so the
   * official adapters (`MongoSource`, `KafkaEventBus`, `SocketServer`, …)
   * work without ceremony. Drained AFTER the HTTP server stops accepting
   * new traffic so in-flight requests still see live connections.
   *
   * @example
   * await bootstrap({
   *   controllers: [UserController],
   *   drainables: [mongo, kafkaBus, socketServer],
   * });
   */
  drainables?: Drainable[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function normaliseCors(value: boolean | CorsOptions): CorsOptions | undefined {
  return typeof value === 'object' ? value : undefined;
}

function normaliseRateLimit(value: boolean | RateLimitOptions): RateLimitOptions {
  return typeof value === 'object' ? value : { windowMs: 15 * 60 * 1000, max: 100 };
}

function normaliseLogging(value: boolean | LoggingOptions): LoggingOptions {
  return typeof value === 'object' ? value : { level: 'info' };
}

/**
 * Copies all providers from `src` into `dst`, skipping tokens that are already
 * bound in `dst` so internal app registrations are never overwritten.
 */
function mergeContainers(src: DIContainer, dst: DIContainer): void {
  src.getTokens().forEach(token => {
    if (dst.has(token)) return;
    const provider = src.getProvider(token);
    if (!provider) return;

    if (provider.useValue !== undefined) {
      dst.bindValue(token, provider.useValue);
    } else if (provider.useFactory) {
      dst.bindFactory(token, provider.useFactory, {
        scope: provider.scope,
        dependencies: provider.dependencies,
        injectContainer: provider.injectContainer,
      });
    } else if (provider.useClass) {
      dst.bindClass(token, provider.useClass, {
        scope: provider.scope,
        dependencies: provider.dependencies,
      });
    }
  });
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Creates and configures a {@link SoapExpressApp} from a declarative config
 * **without** starting the HTTP server.
 *
 * Use this when you need to register additional services or run async setup
 * before calling `app.start(port)`.
 *
 * @example
 * const app = createApp({
 *   controllers: [UserController, ProductController],
 *   middleware: { cors: true, helmet: true },
 *   auth: jwtStrategy,
 *   healthCheck: true,
 * });
 *
 * // Add anything that wasn't known at config time:
 * app.registerValue('Config', loadedConfig);
 *
 * await app.start(3000);
 */
export function createApp(config: BootstrapConfig = {}): SoapExpressApp {
  const {
    controllers = [],
    middleware = {},
    auth,
    plugins = [],
    healthCheck,
    app: appOptions = {},
    container: userContainer,
    cqrs,
    logger,
    drainables = [],
  } = config;

  const pluginList: Array<HttpPlugin | { plugin: HttpPlugin; options?: any }> = [...plugins];

  // Promote a top-level `logger` into the app options so SoapExpressApp picks
  // it up via the BaseHttpApp constructor (which binds it under `Logger.Token`
  // and threads it through the error handler).
  const mergedAppOptions: SoapExpressOptions = logger
    ? { ...appOptions, logger: appOptions.logger ?? logger }
    : appOptions;

  const app = new SoapExpressApp(mergedAppOptions);
  const expressInstance = app.getApp();
  // The CQRS wiring is now async (event-bus adapters may need to open a
  // consumer when handlers subscribe). `createApp` stays synchronous —
  // callers that opt into CQRS via `bootstrap()` get the await for free,
  // and direct `createApp` users can await `app.cqrsReady` before serving.
  let pendingCqrs: Promise<void> | undefined;

  // ── 1. Merge external DI bindings ────────────────────────────────────────
  if (userContainer) {
    mergeContainers(userContainer, app.getContainer());
  }

  // ── 2. Global middleware (Helmet → CORS → Rate-limit → Compression → Logging) ──
  if (middleware.helmet !== false) {
    // Helmet is a hard dependency; enabled by default.
    const helmet = require('helmet');
    expressInstance.use(helmet());
  }

  if (middleware.cors) {
    const { CorsMiddleware } = require('./middlewares/cors');
    expressInstance.use(CorsMiddleware.create(normaliseCors(middleware.cors)));
  }

  if (middleware.rateLimit) {
    const { RateLimitMiddleware } = require('./middlewares/rate-limit');
    expressInstance.use(RateLimitMiddleware.create(normaliseRateLimit(middleware.rateLimit)));
  }

  if (middleware.compression) {
    const compression = require('compression');
    expressInstance.use(compression());
  }

  if (middleware.pre?.length) {
    middleware.pre.forEach((mw) => expressInstance.use(mw));
  }

  if (middleware.logging) {
    const { LoggingMiddleware } = require('./middlewares/logging');
    // Hand the middleware the framework-managed logger so the access log,
    // the per-request `req.log`, and the error handler all share one sink
    // and one structured-logging contract.
    expressInstance.use(
      LoggingMiddleware.create({
        ...normaliseLogging(middleware.logging),
        logger: app.getLogger(),
      }),
    );
  }

  if (middleware.post?.length) {
    middleware.post.forEach((mw) => expressInstance.use(mw));
  }

  // ── 3. Auth strategies ───────────────────────────────────────────────────
  if (auth) {
    const strategies = Array.isArray(auth) ? auth : [auth];
    strategies.forEach(s => app.registerAuthStrategy(s));
  }

  // ── 4. Plugins (metrics, OpenAPI, … — register from your app) ───────────
  pluginList.forEach(entry => {
    if (entry !== null && typeof entry === 'object' && 'plugin' in entry) {
      const { plugin, options } = entry as { plugin: HttpPlugin; options?: any };
      app.usePlugin(plugin, options);
    } else {
      app.usePlugin(entry as HttpPlugin);
    }
  });

  // ── 5. CQRS wiring (lazy require to keep HTTP-only bundles clean) ─────────
  //
  // MUST run BEFORE controllers are bound — `registerController` triggers
  // controller instantiation through DI, and controllers that
  // `@Inject('CommandBus')` / `@Inject('QueryBus')` need those tokens to
  // already be in the container at construction time. Wiring CQRS after
  // controller registration silently injects `undefined` for the buses.
  if (cqrs) {
    const { wireCqrs } = require('./cqrs/wiring');
    // `wireCqrs` is now async because `DomainEventBus.subscribe` may open a
    // broker consumer on first call. The legacy sync caller is preserved
    // — fire-and-forget would race with controller resolution. The HTTP
    // listener doesn't start until `bootstrap()` awaits it (see below).
    pendingCqrs = wireCqrs(
      app.getContainer(),
      typeof cqrs === 'object' ? cqrs : {},
    );
  }

  // ── 6. Controllers: DI bind + route mounting ─────────────────────────────
  controllers.forEach(Controller => {
    // Registers the class in the internal DI container (uses @Injectable token,
    // which @Controller sets automatically to the class name).
    app.registerClass(Controller);
    // Reads DecoratorRegistry to mount all @Get / @Post / … routes.
    app.registerController(Controller);
  });

  // ── 7. Optional health check ─────────────────────────────────────────────
  if (healthCheck) {
    const path = typeof healthCheck === 'string' ? healthCheck : '/health';
    app.healthCheck(path);
  }

  // ── 8. External drainables (DBs, event buses, sockets, …) ────────────────
  //
  // Registered LAST so they shut down in the right order: HTTP server first
  // (stops accepting requests), then plugins, then DBs / brokers. The
  // signal-handler is already installed by BaseHttpApp; this just feeds it
  // the resource list the consumer cares about.
  drainables.forEach((resource) => app.registerDrainable(resource));

  // Expose the async CQRS-ready hook so direct `createApp()` callers can
  // await event subscription before serving requests. `bootstrap()` already
  // awaits this internally.
  (app as SoapExpressApp & { cqrsReady?: Promise<void> }).cqrsReady = pendingCqrs;

  return app;
}

/**
 * Creates an app via {@link createApp} and immediately starts the HTTP server.
 *
 * The promise resolves once the server is listening. Graceful shutdown on
 * SIGTERM / SIGINT is handled automatically by {@link BaseHttpApp}.
 *
 * @param config - Bootstrap config plus optional `port` (default `3000`).
 * @returns The running {@link SoapExpressApp} instance.
 *
 * @example
 * import { bootstrap } from '@soapjs/soap-express';
 * import { UserController } from './controllers/user.controller';
 *
 * await bootstrap({
 *   port: 3000,
 *   controllers: [UserController],
 *   middleware: { cors: true, logging: true },
 *   healthCheck: true,
 * });
 */
export async function bootstrap(
  config: BootstrapConfig & { port?: number } = {}
): Promise<SoapExpressApp> {
  const { port = 3000, ...rest } = config;
  const app = createApp(rest);
  // Wait for `@EventHandler` consumers to subscribe (Kafka adapters open
  // their consumer here) before accepting any HTTP traffic. Otherwise the
  // first few requests could fire commands whose downstream events have no
  // listener yet.
  const cqrsReady = (app as SoapExpressApp & { cqrsReady?: Promise<void> }).cqrsReady;
  if (cqrsReady) {
    await cqrsReady;
  }
  await app.start(port);
  return app;
}
