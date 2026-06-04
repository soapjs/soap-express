import { ErrorHandler, SentryErrorHandler, LoggerErrorHandler, CustomErrorHandler } from '../error-handler';
import { Request, Response } from 'express';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      path: '/test',
      ip: '127.0.0.1',
      body: { name: 'test' },
      query: { page: '1' },
      params: { id: '123' },
      headers: {
        'user-agent': 'test-agent',
        'authorization': 'Bearer token123'
      },
      get: jest.fn((header: string) => {
        const headers = {
          'user-agent': 'test-agent',
          'authorization': 'Bearer token123'
        };
        return headers[header.toLowerCase()];
      })
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      headersSent: false
    };
  });

  describe('constructor', () => {
    it('should initialize with default handler', () => {
      errorHandler = new ErrorHandler();

      expect(errorHandler).toBeDefined();
    });

    it('should initialize with app error handler', () => {
      const appErrorHandler = jest.fn();
      const options = { includeStack: true };

      errorHandler = new ErrorHandler(appErrorHandler, options);

      expect(errorHandler).toBeDefined();
    });
  });

  describe('handle', () => {
    beforeEach(() => {
      errorHandler = new ErrorHandler();
    });

    it('should use route error handler when provided', () => {
      const routeErrorHandler = {
        handler: jest.fn()
      };
      const error = new Error('Test error');

      errorHandler.handle(error, mockReq as Request, mockRes as Response, routeErrorHandler);

      expect(routeErrorHandler.handler).toHaveBeenCalledWith(error, mockReq, mockRes);
    });

    it('should use app error handler when no route handler', () => {
      const appErrorHandler = jest.fn();
      const errorHandler = new ErrorHandler(appErrorHandler);
      const error = new Error('Test error');

      errorHandler.handle(error, mockReq as Request, mockRes as Response);

      expect(appErrorHandler).toHaveBeenCalledWith(error, mockReq, mockRes);
    });

    it('should use default handler when no custom handlers', () => {
      const error = new Error('Test error');

      errorHandler.handle(error, mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('default handler', () => {
    beforeEach(() => {
      errorHandler = new ErrorHandler();
    });

    it('should handle basic error', () => {
      const error = new Error('Test error');

      errorHandler.handle(error, mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        message: 'Test error',
        timestamp: expect.any(String),
        path: '/test',
        method: 'GET'
      });
    });

    it('should handle error with custom status code', () => {
      const error = new Error('Not found');
      (error as any).statusCode = 404;

      errorHandler.handle(error, mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should handle ValidationError', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';

      errorHandler.handle(error, mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Validation failed',
        timestamp: expect.any(String),
        path: '/test',
        method: 'GET'
      });
    });

    it('should handle UnauthorizedError', () => {
      const error = new Error('Unauthorized');
      error.name = 'UnauthorizedError';

      errorHandler.handle(error, mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should handle ForbiddenError', () => {
      const error = new Error('Forbidden');
      error.name = 'ForbiddenError';

      errorHandler.handle(error, mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should handle NotFoundError', () => {
      const error = new Error('Not found');
      error.name = 'NotFoundError';

      errorHandler.handle(error, mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should handle ConflictError', () => {
      const error = new Error('Conflict');
      error.name = 'ConflictError';

      errorHandler.handle(error, mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(409);
    });

    it('should handle RateLimitError', () => {
      const error = new Error('Too many requests');
      error.name = 'RateLimitError';

      errorHandler.handle(error, mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(429);
    });

    it('should include stack trace when option is enabled', () => {
      const options = { includeStack: true };
      const errorHandler = new ErrorHandler(undefined, options);
      const error = new Error('Test error');

      errorHandler.handle(error, mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        message: 'Test error',
        timestamp: expect.any(String),
        path: '/test',
        method: 'GET',
        stack: error.stack
      });
    });

    it('should include request details when option is enabled', () => {
      const options = { includeRequest: true };
      const errorHandler = new ErrorHandler(undefined, options);
      const error = new Error('Test error');

      errorHandler.handle(error, mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        message: 'Test error',
        timestamp: expect.any(String),
        path: '/test',
        method: 'GET',
        request: {
          body: { name: 'test' },
          query: { page: '1' },
          params: { id: '123' },
          headers: {
            'user-agent': 'test-agent',
            'authorization': '[REDACTED]'
          }
        }
      });
    });

    it('should not send response if headers already sent', () => {
      mockRes.headersSent = true;
      const error = new Error('Test error');

      errorHandler.handle(error, mockReq as Request, mockRes as Response);

      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should sanitize sensitive headers', () => {
      const options = { includeRequest: true };
      const errorHandler = new ErrorHandler(undefined, options);
      const error = new Error('Test error');
      mockReq.headers = {
        'authorization': 'Bearer token123',
        'cookie': 'session=abc123',
        'x-api-key': 'secret-key',
        'x-auth-token': 'auth-token',
        'content-type': 'application/json'
      };

      errorHandler.handle(error, mockReq as Request, mockRes as Response);

      const responseData = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(responseData.request.headers.authorization).toBe('[REDACTED]');
      expect(responseData.request.headers.cookie).toBe('[REDACTED]');
      expect(responseData.request.headers['x-api-key']).toBe('[REDACTED]');
      expect(responseData.request.headers['x-auth-token']).toBe('[REDACTED]');
      expect(responseData.request.headers['content-type']).toBe('application/json');
    });
  });

  describe('error logging', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('logs through the Logger port attached as req.log when available', () => {
      const portCalls: Array<{ msg: string; meta?: unknown }> = [];
      const reqLogger = {
        log: jest.fn(),
        error: (msg: string | Error, meta?: unknown) =>
          portCalls.push({
            msg: msg instanceof Error ? msg.message : msg,
            meta,
          }),
        warn: jest.fn(),
        info: jest.fn(),
        http: jest.fn(),
        verbose: jest.fn(),
        debug: jest.fn(),
      };
      (mockReq as { log?: unknown }).log = reqLogger;

      const errorHandler = new ErrorHandler();
      const error = new Error('Test error');
      errorHandler.handle(error, mockReq as Request, mockRes as Response);

      // The Logger port is preferred over `console.error`.
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(portCalls).toHaveLength(1);
      expect(portCalls[0].msg).toBe('Unhandled error');
      expect(portCalls[0].meta).toMatchObject({
        name: 'Error',
        message: 'Test error',
        method: 'GET',
        path: '/test',
        ip: '127.0.0.1',
        userAgent: 'test-agent',
      });
    });

    it('falls back to ErrorHandlerOptions.port when no req.log is attached', () => {
      const portCalls: Array<{ msg: string; meta?: unknown }> = [];
      const portLogger = {
        log: jest.fn(),
        error: (msg: string | Error, meta?: unknown) =>
          portCalls.push({
            msg: msg instanceof Error ? msg.message : msg,
            meta,
          }),
        warn: jest.fn(),
        info: jest.fn(),
        http: jest.fn(),
        verbose: jest.fn(),
        debug: jest.fn(),
      };

      const errorHandler = new ErrorHandler(undefined, { port: portLogger });
      const error = new Error('Test error');
      errorHandler.handle(error, mockReq as Request, mockRes as Response);

      expect(portCalls).toHaveLength(1);
      expect(portCalls[0].msg).toBe('Unhandled error');
    });

    it('should call custom logger when provided', () => {
      const customLogger = jest.fn();
      const options = { logger: customLogger };
      const errorHandler = new ErrorHandler(undefined, options);
      const error = new Error('Test error');

      errorHandler.handle(error, mockReq as Request, mockRes as Response);

      expect(customLogger).toHaveBeenCalledWith(error, mockReq, mockRes);
    });

    it('should call Sentry handler when provided', () => {
      const sentryHandler = jest.fn();
      const options = { sentry: sentryHandler };
      const errorHandler = new ErrorHandler(undefined, options);
      const error = new Error('Test error');

      errorHandler.handle(error, mockReq as Request, mockRes as Response);

      expect(sentryHandler).toHaveBeenCalledWith(error, mockReq, mockRes);
    });

    it('should call custom error handler when provided', () => {
      const customHandler = jest.fn();
      const options = { custom: customHandler };
      const errorHandler = new ErrorHandler(undefined, options);
      const error = new Error('Test error');

      errorHandler.handle(error, mockReq as Request, mockRes as Response);

      expect(customHandler).toHaveBeenCalledWith(error, mockReq, mockRes);
    });
  });
});

describe('SentryErrorHandler', () => {
  let mockSentryClient: any;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockSentryClient = {
      captureException: jest.fn()
    };
    mockReq = {
      method: 'GET',
      path: '/test',
      query: { page: '1' },
      body: { name: 'test' }
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  it('should create Sentry error handler', () => {
    const errorHandler = SentryErrorHandler.create(mockSentryClient);

    expect(errorHandler).toBeDefined();
    expect(errorHandler.handler).toBeDefined();
  });

  it('should capture exception and send response', () => {
    const errorHandler = SentryErrorHandler.create(mockSentryClient);
    const error = new Error('Test error');

    errorHandler.handler(error, mockReq as Request, mockRes as Response);

    expect(mockSentryClient.captureException).toHaveBeenCalledWith(error, {
      tags: {
        component: 'express',
        method: 'GET',
        path: '/test'
      },
      extra: {
        request: {
          method: 'GET',
          path: '/test',
          query: { page: '1' },
          body: { name: 'test' }
        }
      }
    });
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Internal server error',
      timestamp: expect.any(String)
    });
  });
});

describe('LoggerErrorHandler', () => {
  let mockLogger: any;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockLogger = {
      error: jest.fn()
    };
    mockReq = {
      method: 'GET',
      path: '/test',
      ip: '127.0.0.1'
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  it('should create logger error handler', () => {
    const errorHandler = LoggerErrorHandler.create(mockLogger);

    expect(errorHandler).toBeDefined();
    expect(errorHandler.handler).toBeDefined();
  });

  it('should log error and send response', () => {
    const errorHandler = LoggerErrorHandler.create(mockLogger);
    const error = new Error('Test error');

    errorHandler.handler(error, mockReq as Request, mockRes as Response);

    expect(mockLogger.error).toHaveBeenCalledWith('Express Error', {
      error: 'Test error',
      stack: error.stack,
      request: {
        method: 'GET',
        path: '/test',
        ip: '127.0.0.1'
      }
    });
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Internal server error',
      timestamp: expect.any(String)
    });
  });
});

describe('CustomErrorHandler', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      path: '/test'
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  it('should create custom error handler', () => {
    const customHandler = jest.fn();
    const errorHandler = CustomErrorHandler.create(customHandler);

    expect(errorHandler).toBeDefined();
    expect(errorHandler.handler).toBe(customHandler);
  });

  it('should call custom handler function', () => {
    const customHandler = jest.fn();
    const errorHandler = CustomErrorHandler.create(customHandler);
    const error = new Error('Test error');

    errorHandler.handler(error, mockReq as Request, mockRes as Response);

    expect(customHandler).toHaveBeenCalledWith(error, mockReq, mockRes);
  });
});
