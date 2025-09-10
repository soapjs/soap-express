import { Request, Response, NextFunction } from 'express';
import { MetricsMiddleware, createMetricsMiddleware, defaultMetricsConfig } from '../middleware';
import { MetricsConfig } from '../types';

// Mock Express request/response
const createMockReq = (): Partial<Request> => ({
  method: 'GET',
  path: '/api/users',
  route: { path: '/api/users' },
  url: '/api/users'
});

const createMockRes = (): Partial<Response> => {
  const res: Partial<Response> = {
    statusCode: 200,
    end: jest.fn()
  };
  return res;
};

const createMockNext = (): NextFunction => jest.fn();

describe('MetricsMiddleware', () => {
  let config: MetricsConfig;
  let middleware: MetricsMiddleware;

  beforeEach(() => {
    config = {
      enabled: true,
      metrics: {
        responseTime: true,
        requestCount: true,
        errorRate: true,
        memoryUsage: true,
        cpuUsage: true
      }
    };
    middleware = new MetricsMiddleware(config);
  });

  afterEach(() => {
    middleware.destroy();
  });

  describe('middleware function', () => {
    it('should return Express middleware function', () => {
      const middlewareFn = middleware.middleware();
      expect(typeof middlewareFn).toBe('function');
    });

    it('should call next function', () => {
      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();
      
      const middlewareFn = middleware.middleware();
      middlewareFn(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should override res.end to capture metrics', () => {
      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();
      
      const originalEnd = res.end;
      const middlewareFn = middleware.middleware();
      
      middlewareFn(req, res, next);
      
      expect(res.end).not.toBe(originalEnd);
      expect(typeof res.end).toBe('function');
    });

    it('should call original res.end after recording metrics', () => {
      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();
      
      const originalEnd = jest.fn();
      res.end = originalEnd;
      
      const middlewareFn = middleware.middleware();
      middlewareFn(req, res, next);
      
      // Call the overridden end function
      res.end('test');
      
      expect(originalEnd).toHaveBeenCalledWith('test');
    });
  });

  describe('getCollector', () => {
    it('should return SoapMetricsCollector instance', () => {
      const collector = middleware.getCollector();
      expect(collector).toBeDefined();
      expect(typeof collector.recordResponseTime).toBe('function');
      expect(typeof collector.recordRequestCount).toBe('function');
      expect(typeof collector.counter).toBe('function');
    });
  });

  describe('destroy', () => {
    it('should destroy collector', () => {
      const collector = middleware.getCollector();
      const destroySpy = jest.spyOn(collector, 'destroy');
      
      middleware.destroy();
      
      expect(destroySpy).toHaveBeenCalled();
    });
  });
});

describe('createMetricsMiddleware', () => {
  it('should create MetricsMiddleware instance', () => {
    const testConfig: MetricsConfig = {
      enabled: true,
      metrics: {
        responseTime: true,
        requestCount: true,
        errorRate: true,
        memoryUsage: true,
        cpuUsage: true
      }
    };
    const middleware = createMetricsMiddleware(testConfig);
    expect(middleware).toBeInstanceOf(MetricsMiddleware);
  });
});

describe('defaultMetricsConfig', () => {
  it('should have correct default values', () => {
    expect(defaultMetricsConfig.enabled).toBe(true);
    expect(defaultMetricsConfig.metrics.responseTime).toBe(true);
    expect(defaultMetricsConfig.metrics.requestCount).toBe(true);
    expect(defaultMetricsConfig.metrics.errorRate).toBe(true);
    expect(defaultMetricsConfig.metrics.memoryUsage).toBe(true);
    expect(defaultMetricsConfig.metrics.cpuUsage).toBe(true);
    expect(defaultMetricsConfig.collectInterval).toBe(30000);
    expect(defaultMetricsConfig.includeRouteParams).toBe(false);
    expect(defaultMetricsConfig.customLabels).toEqual({});
  });
});
