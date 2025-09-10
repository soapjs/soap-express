import { Request, Response, NextFunction } from 'express';
import { 
  MemoryMonitoringMiddleware, 
  createMemoryMonitoringMiddleware, 
  createMemoryConfig 
} from '../middleware';
import { MemoryMonitoringConfig } from '../types';

// Extend Request interface for testing
declare global {
  namespace Express {
    interface Request {
      memoryInfo?: any;
    }
  }
}

// Mock Express request/response
const createMockReq = (): Partial<Request> => ({
  method: 'GET',
  path: '/api/users',
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

describe('MemoryMonitoringMiddleware', () => {
  let config: MemoryMonitoringConfig;
  let middleware: MemoryMonitoringMiddleware;

  beforeEach(() => {
    config = {
      enabled: true,
      interval: 1000,
      threshold: {
        used: 100 * 1024 * 1024, // 100MB
        percentage: 50,
        heapUsed: 50 * 1024 * 1024, // 50MB
        rss: 100 * 1024 * 1024 // 100MB
      },
      leakDetection: {
        enabled: true,
        consecutiveGrowths: 2,
        growthThreshold: 5,
        maxHistory: 10
      }
    };
    middleware = new MemoryMonitoringMiddleware(config);
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

    it('should add memory info to request', () => {
      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();
      
      const middlewareFn = middleware.middleware();
      middlewareFn(req, res, next);
      
      expect(req.memoryInfo).toBeDefined();
      expect(req.memoryInfo).toHaveProperty('used');
      expect(req.memoryInfo).toHaveProperty('total');
      expect(req.memoryInfo).toHaveProperty('percentage');
    });
  });

  describe('getMonitor', () => {
    it('should return MemoryMonitor instance', () => {
      const monitor = middleware.getMonitor();
      expect(monitor).toBeDefined();
      expect(typeof monitor.getCurrentMemoryInfo).toBe('function');
    });
  });

  describe('getStats', () => {
    it('should return memory stats', () => {
      const stats = middleware.getStats();
      expect(stats).toHaveProperty('current');
      expect(stats).toHaveProperty('history');
      expect(stats).toHaveProperty('leaks');
      expect(stats).toHaveProperty('uptime');
      expect(stats).toHaveProperty('lastCheck');
    });
  });

  describe('getSummary', () => {
    it('should return memory summary', () => {
      const summary = middleware.getSummary();
      expect(summary).toHaveProperty('current');
      expect(summary).toHaveProperty('status');
      expect(summary).toHaveProperty('leaks');
      expect(summary).toHaveProperty('uptime');
      expect(summary).toHaveProperty('lastCheck');
    });
  });

  describe('forceGC', () => {
    it('should call forceGC on monitor', () => {
      const monitor = middleware.getMonitor();
      const forceGCSpy = jest.spyOn(monitor, 'forceGC');
      
      middleware.forceGC();
      
      expect(forceGCSpy).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should destroy monitor', () => {
      const monitor = middleware.getMonitor();
      const destroySpy = jest.spyOn(monitor, 'destroy');
      
      middleware.destroy();
      
      expect(destroySpy).toHaveBeenCalled();
    });
  });
});

describe('createMemoryMonitoringMiddleware', () => {
  it('should create MemoryMonitoringMiddleware instance', () => {
    const testConfig: MemoryMonitoringConfig = {
      enabled: true,
      interval: 1000,
      threshold: {
        used: 100 * 1024 * 1024,
        percentage: 50,
        heapUsed: 50 * 1024 * 1024,
        rss: 100 * 1024 * 1024
      },
      leakDetection: {
        enabled: true,
        consecutiveGrowths: 2,
        growthThreshold: 5,
        maxHistory: 10
      }
    };
    const middleware = createMemoryMonitoringMiddleware(testConfig);
    expect(middleware).toBeInstanceOf(MemoryMonitoringMiddleware);
  });
});

describe('createMemoryConfig', () => {
  it('should create config from simple options', () => {
    const config = createMemoryConfig({
      threshold: '256MB',
      interval: 5000,
      onLeak: jest.fn(),
      onThreshold: jest.fn()
    });

    expect(config.threshold.used).toBe(256 * 1024 * 1024);
    expect(config.interval).toBe(5000);
    expect(config.onLeak).toBeDefined();
    expect(config.onThreshold).toBeDefined();
  });

  it('should handle numeric threshold', () => {
    const config = createMemoryConfig({
      threshold: 512 * 1024 * 1024,
      interval: 10000
    });

    expect(config.threshold.used).toBe(512 * 1024 * 1024);
    expect(config.interval).toBe(10000);
  });

  it('should use default values', () => {
    const config = createMemoryConfig({});

    expect(config.threshold.used).toBe(512 * 1024 * 1024);
    expect(config.interval).toBe(30000);
    expect(config.onLeak).toBeUndefined();
    expect(config.onThreshold).toBeUndefined();
  });
});
