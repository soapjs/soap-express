import { LoggingMiddleware } from '../logging';
import { Request, Response, NextFunction } from 'express';
import { Logger } from '@soapjs/soap/common';

/**
 * Recording stub for the Logger port. Lets each test assert what the
 * middleware emitted (level + message + structured fields) without coupling
 * to a real log sink.
 */
function makeRecordingLogger(): {
  logger: Logger;
  records: Array<{ level: string; message: string; fields?: unknown }>;
  bindings: Record<string, unknown>;
} {
  const records: Array<{ level: string; message: string; fields?: unknown }> = [];
  const bindings: Record<string, unknown> = {};

  function record(level: string) {
    return (message: string, fields?: unknown) => {
      records.push({ level, message, fields });
    };
  }

  const logger: Logger = {
    log: (lvl: string, msg: string, ...args: unknown[]) =>
      records.push({ level: lvl, message: msg, fields: args[0] }),
    error: (msg, ...args) =>
      records.push({
        level: 'error',
        message: msg instanceof Error ? msg.message : msg,
        fields: args[0],
      }),
    warn: record('warn'),
    info: record('info'),
    http: record('http'),
    verbose: record('verbose'),
    debug: record('debug'),
    child: (b) => {
      Object.assign(bindings, b);
      return logger;
    },
  };

  return { logger, records, bindings };
}

function makeRequest(overrides: Partial<Request> = {}): Request {
  const headers: Record<string, string> = {};
  return {
    method: 'GET',
    path: '/test',
    ip: '127.0.0.1',
    query: { page: '1' },
    body: { name: 'test' },
    headers,
    header(name: string) {
      return headers[name.toLowerCase()];
    },
    ...overrides,
  } as unknown as Request;
}

function makeResponse(): Response & { headers: Record<string, string> } {
  const headers: Record<string, string> = {};
  return {
    statusCode: 200,
    headers,
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value;
    },
    end: jest.fn(function (this: Response) {
      return this;
    }),
  } as unknown as Response & { headers: Record<string, string> };
}

describe('LoggingMiddleware.create', () => {
  it('assigns an X-Request-Id when the request has none, and mirrors it on the response', () => {
    const { logger } = makeRecordingLogger();
    const middleware = LoggingMiddleware.create({ level: 'info', logger });

    const req = makeRequest();
    const res = makeResponse();
    const next = jest.fn();

    middleware(req, res, next);

    expect(req.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(res.headers['x-request-id']).toBe(req.requestId);
    expect(next).toHaveBeenCalled();
  });

  it('echoes back an inbound X-Request-Id header verbatim', () => {
    const { logger } = makeRecordingLogger();
    const middleware = LoggingMiddleware.create({ level: 'info', logger });

    const req = makeRequest();
    (req.headers as Record<string, string>)['x-request-id'] = 'trace-1234';
    const res = makeResponse();
    middleware(req, res, jest.fn());

    expect(req.requestId).toBe('trace-1234');
    expect(res.headers['x-request-id']).toBe('trace-1234');
  });

  it('attaches a child logger with requestId/method/path bindings as req.log', () => {
    const { logger, bindings } = makeRecordingLogger();
    const middleware = LoggingMiddleware.create({ level: 'info', logger });

    const req = makeRequest();
    const res = makeResponse();
    middleware(req, res, jest.fn());

    expect(bindings).toMatchObject({
      requestId: req.requestId,
      method: 'GET',
      path: '/test',
    });
    expect(req.log).toBeDefined();
  });

  it('emits one http record on entry and one again on response.end with status + duration', () => {
    const { logger, records } = makeRecordingLogger();
    const middleware = LoggingMiddleware.create({ level: 'info', logger });

    const req = makeRequest();
    const res = makeResponse();
    middleware(req, res, jest.fn());

    expect(records.filter((r) => r.level === 'http')).toHaveLength(1);
    expect(records[0]).toMatchObject({
      level: 'http',
      message: 'GET /test',
      fields: { ip: '127.0.0.1' },
    });

    res.statusCode = 200;
    (res.end as jest.Mock)('payload');

    const last = records[records.length - 1];
    expect(last.level).toBe('http');
    expect(last.message).toBe('GET /test → 200');
    expect(last.fields).toMatchObject({ status: 200 });
    expect((last.fields as { durationMs: number }).durationMs).toBeGreaterThanOrEqual(0);
  });

  it('escalates to warn for 4xx and error for 5xx responses', () => {
    const { logger, records } = makeRecordingLogger();
    const middleware = LoggingMiddleware.create({ level: 'info', logger });

    const req = makeRequest();
    const res = makeResponse();
    middleware(req, res, jest.fn());

    res.statusCode = 404;
    (res.end as jest.Mock)();
    expect(records[records.length - 1].level).toBe('warn');

    middleware(req, res, jest.fn());
    res.statusCode = 503;
    (res.end as jest.Mock)();
    expect(records[records.length - 1].level).toBe('error');
  });

  it('forwards every argument to the original res.end so the response is unchanged', () => {
    const { logger } = makeRecordingLogger();
    const middleware = LoggingMiddleware.create({ level: 'info', logger });

    const req = makeRequest();
    const res = makeResponse();
    const originalEnd = res.end as jest.Mock;
    middleware(req, res, jest.fn());

    (res.end as jest.Mock)('payload', 'utf8');
    expect(originalEnd).toHaveBeenCalledWith('payload', 'utf8');
  });

  it('respects the skip predicate by short-circuiting before any logging or wrapping happens', () => {
    const { logger, records } = makeRecordingLogger();
    const middleware = LoggingMiddleware.create({
      level: 'info',
      logger,
      skip: (req) => req.path === '/health',
    });

    const req = makeRequest({ path: '/health' });
    const res = makeResponse();
    const originalEnd = res.end;
    const next = jest.fn();

    middleware(req, res, next);

    expect(records).toEqual([]);
    expect(req.requestId).toBeUndefined();
    expect(req.log).toBeUndefined();
    expect(res.end).toBe(originalEnd);
    expect(next).toHaveBeenCalled();
  });

  it('falls back to a default ConsoleLogger when no logger is provided', () => {
    // The actual sink writes to stdout; we just assert this doesn't throw and
    // produces a request id (i.e. the middleware still functions).
    const middleware = LoggingMiddleware.create({ level: 'info' });
    const req = makeRequest();
    const res = makeResponse();
    const next = jest.fn();
    middleware(req, res, next);
    expect(req.requestId).toBeDefined();
    expect(next).toHaveBeenCalled();
  });
});

describe('LoggingMiddleware.createDetailed', () => {
  it('records the inbound request body and headers at debug level', () => {
    const { logger, records } = makeRecordingLogger();
    const middleware = LoggingMiddleware.createDetailed({ level: 'debug', logger });

    const req = makeRequest();
    const res = makeResponse();
    middleware(req, res, jest.fn());

    const first = records[0];
    expect(first.level).toBe('debug');
    expect(first.message).toBe('Incoming request');
    expect(first.fields).toMatchObject({
      method: 'GET',
      path: '/test',
      body: { name: 'test' },
    });
  });

  it('records the outbound status, duration, and response size on res.end', () => {
    const { logger, records } = makeRecordingLogger();
    const middleware = LoggingMiddleware.createDetailed({ level: 'debug', logger });

    const req = makeRequest();
    const res = makeResponse();
    res.statusCode = 404;
    middleware(req, res, jest.fn());

    (res.end as jest.Mock)('not found');

    const last = records[records.length - 1];
    expect(last.message).toBe('Outgoing response');
    expect(last.fields).toMatchObject({ status: 404, responseSize: 9 });
  });
});
