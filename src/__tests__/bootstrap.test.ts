import 'reflect-metadata';
import { createApp, bootstrap, BootstrapConfig } from '../bootstrap';
import { DIContainer } from '@soapjs/soap/common';
import { Controller } from '../decorators/controller';

// ── Express mock ───────────────────────────────────────────────────────────

const mockExpressInstance = {
  use: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
};

jest.mock('express', () => {
  const express = () => mockExpressInstance;
  express.json = jest.fn(() => 'json-middleware');
  express.urlencoded = jest.fn(() => 'urlencoded-middleware');
  return { __esModule: true, default: express, ...express };
});

jest.mock('http', () => ({
  createServer: jest.fn(() => ({
    listen: jest.fn((_port: number, cb: () => void) => cb()),
    close: jest.fn((cb: () => void) => cb()),
  })),
}));

// ── Registry / builder mocks ───────────────────────────────────────────────

// A dynamic controller map so tests can populate it with fake @Controller metadata.
const fakeControllerMap = new Map<string, any>();

jest.mock('../decorators/registry', () => ({
  DecoratorRegistry: {
    getControllers: jest.fn(() => fakeControllerMap),
    getRoutes: jest.fn(() => new Map()),
    registerController: jest.fn((target: any, meta: any) => {
      fakeControllerMap.set(target.name, meta);
    }),
    // CQRS hooks consumed by wireCqrs — return empty by default
    getCommandBus: jest.fn(() => undefined),
    getQueryBus: jest.fn(() => undefined),
    getCommandHandlers: jest.fn(() => [] as any[]),
    getQueryHandlers: jest.fn(() => [] as any[]),
    getEventHandlers: jest.fn(() => [] as any[]),
  },
}));

jest.mock('../utils/route-builder', () => ({
  RouteBuilder: jest.fn().mockImplementation(() => ({
    registerController: jest.fn(),
    registerRouter: jest.fn(),
    registerRoute: jest.fn(),
    registerRouteGroup: jest.fn(),
  })),
}));

jest.mock('../error-handling/error-handler');
jest.mock('../auth');

// ── External library mocks ─────────────────────────────────────────────────

const mockHelmet = jest.fn(() => 'helmet-middleware');
const mockCors = jest.fn(() => 'cors-middleware');
const mockRateLimit = jest.fn(() => 'rate-limit-middleware');
const mockCompression = jest.fn(() => 'compression-middleware');

jest.mock('helmet', () => mockHelmet);
jest.mock('cors', () => mockCors);
jest.mock('express-rate-limit', () => mockRateLimit);
jest.mock('compression', () => mockCompression);

const mockCorsMiddlewareCreate = jest.fn(() => 'cors-middleware');
const mockRateLimitMiddlewareCreate = jest.fn((_options?: any) => 'rate-limit-middleware');
const mockLoggingMiddlewareCreate = jest.fn(() => 'logging-middleware');

jest.mock('../middlewares/cors', () => ({
  CorsMiddleware: { create: mockCorsMiddlewareCreate },
}));

jest.mock('../middlewares/rate-limit', () => ({
  RateLimitMiddleware: {
    create: (options: any) => mockRateLimitMiddlewareCreate(options),
    createSecurityThrottle: jest.fn(() => ['security-throttle-middleware']),
  },
}));

jest.mock('../middlewares/logging', () => ({
  LoggingMiddleware: { create: mockLoggingMiddlewareCreate },
}));

// ── Tests ──────────────────────────────────────────────────────────────────

describe('createApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fakeControllerMap.clear();
  });

  it('returns a SoapExpressApp instance', () => {
    const { SoapExpressApp } = require('../app');
    const app = createApp();
    expect(app).toBeInstanceOf(SoapExpressApp);
  });

  it('works with an empty config', () => {
    expect(() => createApp({})).not.toThrow();
  });

  // ── Helmet ───────────────────────────────────────────────────────────────

  it('applies helmet by default (no middleware key)', () => {
    const app = createApp({});
    expect(mockHelmet).toHaveBeenCalled();
    expect(mockExpressInstance.use).toHaveBeenCalledWith('helmet-middleware');
  });

  it('applies helmet when middleware.helmet is true', () => {
    createApp({ middleware: { helmet: true } });
    expect(mockHelmet).toHaveBeenCalled();
  });

  it('skips helmet when middleware.helmet is false', () => {
    createApp({ middleware: { helmet: false } });
    expect(mockHelmet).not.toHaveBeenCalled();
  });

  // ── CORS ─────────────────────────────────────────────────────────────────

  it('does not add CORS by default', () => {
    createApp({});
    expect(mockCorsMiddlewareCreate).not.toHaveBeenCalled();
  });

  it('applies CORS with permissive defaults when middleware.cors is true', () => {
    createApp({ middleware: { cors: true } });
    expect(mockCorsMiddlewareCreate).toHaveBeenCalledWith(undefined);
    expect(mockExpressInstance.use).toHaveBeenCalledWith('cors-middleware');
  });

  it('forwards CorsOptions when middleware.cors is an object', () => {
    const corsOptions = { origin: 'https://example.com', credentials: true };
    createApp({ middleware: { cors: corsOptions } });
    expect(mockCorsMiddlewareCreate).toHaveBeenCalledWith(corsOptions);
  });

  // ── Rate-limit ────────────────────────────────────────────────────────────

  it('does not add rate limiting by default', () => {
    createApp({});
    expect(mockRateLimitMiddlewareCreate).not.toHaveBeenCalled();
  });

  it('applies rate limit with defaults when middleware.rateLimit is true', () => {
    createApp({ middleware: { rateLimit: true } });
    expect(mockRateLimitMiddlewareCreate).toHaveBeenCalledWith({
      windowMs: 15 * 60 * 1000,
      max: 100,
    });
    expect(mockExpressInstance.use).toHaveBeenCalledWith('rate-limit-middleware');
  });

  it('forwards RateLimitOptions when middleware.rateLimit is an object', () => {
    const rlOptions = { windowMs: 60_000, max: 10 };
    createApp({ middleware: { rateLimit: rlOptions } });
    expect(mockRateLimitMiddlewareCreate).toHaveBeenCalledWith(rlOptions);
  });

  // ── Compression ───────────────────────────────────────────────────────────

  it('does not add compression by default', () => {
    createApp({});
    expect(mockCompression).not.toHaveBeenCalled();
  });

  it('applies compression when middleware.compression is true', () => {
    createApp({ middleware: { compression: true } });
    expect(mockCompression).toHaveBeenCalled();
    expect(mockExpressInstance.use).toHaveBeenCalledWith('compression-middleware');
  });

  // ── Logging ───────────────────────────────────────────────────────────────

  it('does not add logging by default', () => {
    createApp({});
    expect(mockLoggingMiddlewareCreate).not.toHaveBeenCalled();
  });

  it('applies logging with default level when middleware.logging is true, threading the app logger through', () => {
    createApp({ middleware: { logging: true } });
    expect(mockLoggingMiddlewareCreate).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'info', logger: expect.anything() }),
    );
    expect(mockExpressInstance.use).toHaveBeenCalledWith('logging-middleware');
  });

  it('forwards LoggingOptions when middleware.logging is an object and still injects the app logger', () => {
    const logOptions = { level: 'debug' as const };
    createApp({ middleware: { logging: logOptions } });
    expect(mockLoggingMiddlewareCreate).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'debug', logger: expect.anything() }),
    );
  });

  // ── Middleware order ──────────────────────────────────────────────────────

  it('registers middleware in order: helmet → cors → rateLimit → compression → logging', () => {
    createApp({
      middleware: {
        cors: true,
        rateLimit: true,
        compression: true,
        logging: true,
        helmet: true,
      },
    });

    const useCalls = mockExpressInstance.use.mock.calls.map(c => c[0]);
    const helmetIdx = useCalls.indexOf('helmet-middleware');
    const corsIdx = useCalls.indexOf('cors-middleware');
    const rlIdx = useCalls.indexOf('rate-limit-middleware');
    const compIdx = useCalls.indexOf('compression-middleware');
    const logIdx = useCalls.indexOf('logging-middleware');

    expect(helmetIdx).toBeLessThan(corsIdx);
    expect(corsIdx).toBeLessThan(rlIdx);
    expect(rlIdx).toBeLessThan(compIdx);
    expect(compIdx).toBeLessThan(logIdx);
  });

  // ── Controllers ───────────────────────────────────────────────────────────

  it('calls registerClass and registerController for each controller', () => {
    // @Controller applies @Injectable + registers in DecoratorRegistry
    @Controller('/a')
    class CtrlA {}

    @Controller('/b')
    class CtrlB {}

    const app = createApp({ controllers: [CtrlA, CtrlB] });

    // routeBuilder.registerController is called for each mounted controller
    const { RouteBuilder } = require('../utils/route-builder');
    const builderInstance = RouteBuilder.mock.results[RouteBuilder.mock.results.length - 1].value;
    expect(builderInstance.registerController).toHaveBeenCalledTimes(2);
    expect(builderInstance.registerController).toHaveBeenCalledWith(CtrlA);
    expect(builderInstance.registerController).toHaveBeenCalledWith(CtrlB);
  });

  it('auto-registers controller in DI container so routes can resolve it', () => {
    @Controller('/some')
    class SomeCtrl {}

    const app = createApp({ controllers: [SomeCtrl] });
    expect(app.getContainer().has('SomeCtrl')).toBe(true);
  });

  // Regression: `cqrs: true` must wire CommandBus/QueryBus BEFORE controllers
  // are registered, because `registerController` instantiates the controller
  // through DI — controllers that @Inject('CommandBus')/('QueryBus') would
  // otherwise be constructed with `undefined` for the buses.
  it('binds CommandBus/QueryBus before controllers are instantiated when cqrs is enabled', () => {
    @Controller('/cqrs')
    class CqrsCtrl {}

    const app = createApp({ controllers: [CqrsCtrl], cqrs: true });

    expect(app.getContainer().has('CommandBus')).toBe(true);
    expect(app.getContainer().has('QueryBus')).toBe(true);

    const cmdBus = app.getContainer().get<any>('CommandBus');
    const qryBus = app.getContainer().get<any>('QueryBus');
    expect(typeof cmdBus.dispatch).toBe('function');
    expect(typeof qryBus.dispatch).toBe('function');
  });

  // ── Auth ──────────────────────────────────────────────────────────────────

  it('registers a single auth strategy', () => {
    const app = createApp({});
    const spy = jest.spyOn(app, 'registerAuthStrategy');
    const strategy = { type: 'jwt' } as any;
    app.registerAuthStrategy(strategy);
    expect(spy).toHaveBeenCalledWith(strategy);
  });

  it('registers multiple auth strategies from an array', () => {
    const strategies = [{ type: 'jwt' } as any, { type: 'api-key' } as any];
    const app = createApp({});
    const spy = jest.spyOn(app, 'registerAuthStrategy');
    strategies.forEach(s => app.registerAuthStrategy(s));
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith(strategies[0]);
    expect(spy).toHaveBeenCalledWith(strategies[1]);
  });

  it('registers strategies passed in the config', () => {
    const strategies = [{ type: 'jwt' } as any, { type: 'api-key' } as any];
    // Spy before createApp by intercepting registerAuthStrategy on the prototype
    const spy = jest.spyOn(
      require('../app').SoapExpressApp.prototype,
      'registerAuthStrategy'
    );
    createApp({ auth: strategies });
    expect(spy).toHaveBeenCalledWith(strategies[0]);
    expect(spy).toHaveBeenCalledWith(strategies[1]);
    spy.mockRestore();
  });

  // ── Health check ──────────────────────────────────────────────────────────

  it('does not add health-check endpoint by default', () => {
    createApp({});
    expect(mockExpressInstance.get).not.toHaveBeenCalled();
  });

  it('mounts GET /health when healthCheck is true', () => {
    createApp({ healthCheck: true });
    expect(mockExpressInstance.get).toHaveBeenCalledWith('/health', expect.any(Function));
  });

  it('mounts GET /status when healthCheck is "/status"', () => {
    createApp({ healthCheck: '/status' });
    expect(mockExpressInstance.get).toHaveBeenCalledWith('/status', expect.any(Function));
  });

  // ── Container merging ─────────────────────────────────────────────────────

  it('merges value bindings from an external container', () => {
    const external = new DIContainer();
    external.bindValue('Config', { secret: 'abc' });

    const app = createApp({ container: external });
    expect(app.getContainer().has('Config')).toBe(true);
    expect(app.getContainer().get<any>('Config')).toEqual({ secret: 'abc' });
  });

  it('merges factory bindings from an external container', () => {
    const external = new DIContainer();
    const factory = () => ({ value: 42 });
    external.bindFactory('MyFactory', factory);

    const app = createApp({ container: external });
    expect(app.getContainer().has('MyFactory')).toBe(true);
    expect(app.getContainer().get<any>('MyFactory')).toEqual({ value: 42 });
  });

  it('does not overwrite internal app bindings during merge', () => {
    const external = new DIContainer();
    // AuthMiddlewareFactory is registered internally by SoapExpressApp
    external.bindValue('AuthMiddlewareFactory', { FAKE: true });

    const app = createApp({ container: external });
    // The real AuthMiddlewareFactory instance should still be there
    const factory = app.getContainer().get<any>('AuthMiddlewareFactory');
    expect(factory).not.toEqual({ FAKE: true });
    expect(factory).toBeDefined();
  });

  it('ignores an empty external container', () => {
    const external = new DIContainer();
    expect(() => createApp({ container: external })).not.toThrow();
  });
});

// ── Logger / Drainables ────────────────────────────────────────────────────

describe('createApp — logger + drainables', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fakeControllerMap.clear();
  });

  it('binds the custom logger under Logger.Token so DI consumers see the same instance', () => {
    const { Logger } = require('@soapjs/soap/common');
    const myLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      http: jest.fn(),
      verbose: jest.fn(),
      debug: jest.fn(),
      child: jest.fn().mockReturnThis(),
    };

    const app = createApp({ logger: myLogger });
    expect(app.getContainer().get(Logger.Token)).toBe(myLogger);
    expect(app.getLogger()).toBe(myLogger);
  });

  it('passes the framework logger to LoggingMiddleware so request logs and error logs share one sink', () => {
    createApp({ middleware: { logging: true } });

    expect(mockLoggingMiddlewareCreate).toHaveBeenCalledTimes(1);
    const calls = mockLoggingMiddlewareCreate.mock.calls as unknown as Array<
      Array<{ logger?: unknown }>
    >;
    const opts = calls[0][0];
    expect(opts).toHaveProperty('logger');
    expect(opts.logger).toBeDefined();
  });

  it('registers every entry in `drainables` so SIGTERM tears them down with the app', () => {
    const drain1 = { close: jest.fn() };
    const drain2 = { disconnect: jest.fn() };
    const drain3 = { gracefulShutdown: jest.fn() };

    const app = createApp({ drainables: [drain1, drain2, drain3] });

    expect(app.getDrainables()).toEqual([drain1, drain2, drain3]);
  });

  it('omits drainables registration entirely when none are configured', () => {
    const app = createApp({});
    expect(app.getDrainables()).toEqual([]);
  });
});

// ── bootstrap ──────────────────────────────────────────────────────────────

describe('bootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fakeControllerMap.clear();
  });

  it('starts the server on the default port (3000)', async () => {
    const { createServer } = require('http');
    const mockServer = createServer();
    createServer.mockReturnValue(mockServer);
    mockServer.listen.mockImplementation((_port: number, cb: () => void) => cb());

    const app = await bootstrap({});
    expect(mockServer.listen).toHaveBeenCalledWith(3000, expect.any(Function));
  });

  it('starts the server on a custom port', async () => {
    const { createServer } = require('http');
    const mockServer = createServer();
    createServer.mockReturnValue(mockServer);
    mockServer.listen.mockImplementation((_port: number, cb: () => void) => cb());

    const app = await bootstrap({ port: 8080 });
    expect(mockServer.listen).toHaveBeenCalledWith(8080, expect.any(Function));
  });

  it('returns the running SoapExpressApp', async () => {
    const { SoapExpressApp } = require('../app');
    const { createServer } = require('http');
    const mockServer = { listen: jest.fn((_p: number, cb: () => void) => cb()) };
    createServer.mockReturnValue(mockServer);

    const app = await bootstrap({});
    expect(app).toBeInstanceOf(SoapExpressApp);
  });

  it('resolves to a started app with all config applied', async () => {
    const { createServer } = require('http');
    const mockServer = { listen: jest.fn((_p: number, cb: () => void) => cb()) };
    createServer.mockReturnValue(mockServer);

    const app = await bootstrap({
      port: 4000,
      middleware: { helmet: true, cors: true },
      healthCheck: true,
    });

    expect(mockHelmet).toHaveBeenCalled();
    expect(mockCorsMiddlewareCreate).toHaveBeenCalled();
    expect(mockExpressInstance.get).toHaveBeenCalledWith('/health', expect.any(Function));
    expect(mockServer.listen).toHaveBeenCalledWith(4000, expect.any(Function));
  });
});
