import { SoapExpressApp } from '../../app';
import { MemoryMonitoringConfig } from '../types';
import { createMemoryConfig } from '../middleware';

describe('Memory Monitoring Integration', () => {
  let app: SoapExpressApp;

  afterEach(() => {
    if (app) {
      app.destroy();
    }
  });

  describe('useMemoryMonitoring method', () => {
    it('should enable memory monitoring', () => {
      const config: MemoryMonitoringConfig = {
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

      app = new SoapExpressApp({});
      app.useMemoryMonitoring(config);

      expect(app.getMemoryMonitor()).toBeDefined();
      expect(app.getMemoryMiddleware()).toBeDefined();
    });

    it('should return app instance for chaining', () => {
      const config: MemoryMonitoringConfig = {
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

      app = new SoapExpressApp({});
      const result = app.useMemoryMonitoring(config);

      expect(result).toBe(app);
    });
  });

  describe('Memory monitoring with callbacks', () => {
    it('should call onLeak callback when leak detected', (done) => {
      const onLeakSpy = jest.fn();
      const config: MemoryMonitoringConfig = {
        enabled: true,
        interval: 100,
        threshold: {
          used: 100 * 1024 * 1024,
          percentage: 50,
          heapUsed: 50 * 1024 * 1024,
          rss: 100 * 1024 * 1024
        },
        leakDetection: {
          enabled: true,
          consecutiveGrowths: 2,
          growthThreshold: 1, // Very low threshold
          maxHistory: 10
        },
        onLeak: onLeakSpy
      };

      app = new SoapExpressApp({});
      app.useMemoryMonitoring(config);

      // Create memory pressure
      const createMemoryPressure = () => {
        const arrays = [];
        for (let i = 0; i < 100; i++) {
          arrays.push(new Array(1000).fill('test'));
        }
        return arrays;
      };

      createMemoryPressure();

      setTimeout(() => {
        expect(onLeakSpy).toHaveBeenCalled();
        done();
      }, 500);
    });

    it('should call onThreshold callback when threshold exceeded', (done) => {
      const onThresholdSpy = jest.fn();
      const config: MemoryMonitoringConfig = {
        enabled: true,
        interval: 100,
        threshold: {
          used: 1, // Very low threshold
          percentage: 0.1,
          heapUsed: 1,
          rss: 1
        },
        leakDetection: {
          enabled: false,
          consecutiveGrowths: 2,
          growthThreshold: 5,
          maxHistory: 10
        },
        onThreshold: onThresholdSpy
      };

      app = new SoapExpressApp({});
      app.useMemoryMonitoring(config);

      setTimeout(() => {
        expect(onThresholdSpy).toHaveBeenCalled();
        done();
      }, 200);
    });
  });

  describe('Memory monitoring with simple config', () => {
    it('should work with createMemoryConfig helper', () => {
      const config = createMemoryConfig({
        threshold: '256MB',
        interval: 5000,
        onLeak: jest.fn(),
        onThreshold: jest.fn()
      });

      app = new SoapExpressApp({});
      app.useMemoryMonitoring(config);

      expect(app.getMemoryMonitor()).toBeDefined();
      expect(app.getMemoryMiddleware()).toBeDefined();
    });
  });

  describe('Memory monitoring with routes', () => {
    it('should add memory info to requests', (done) => {
      const config: MemoryMonitoringConfig = {
        enabled: true,
        interval: 1000,
        threshold: {
          used: 100 * 1024 * 1024,
          percentage: 50,
          heapUsed: 50 * 1024 * 1024,
          rss: 100 * 1024 * 1024
        },
        leakDetection: {
          enabled: false,
          consecutiveGrowths: 2,
          growthThreshold: 5,
          maxHistory: 10
        }
      };

      app = new SoapExpressApp({});
      app.useMemoryMonitoring(config);

      // Add a route
      app.getApp().get('/api/test', (req: any, res) => {
        expect(req.memoryInfo).toBeDefined();
        expect(req.memoryInfo).toHaveProperty('used');
        expect(req.memoryInfo).toHaveProperty('total');
        expect(req.memoryInfo).toHaveProperty('percentage');
        res.json({ success: true });
        done();
      });

      // Start server and make request
      app.start(3001).then(() => {
        const http = require('http');
        const req = http.get('http://localhost:3001/api/test', (res) => {
          res.on('data', () => {});
          res.on('end', () => {
            app.destroy();
          });
        });
        req.on('error', done);
      });
    });
  });

  describe('Memory monitoring stats', () => {
    it('should provide memory statistics', () => {
      const config: MemoryMonitoringConfig = {
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

      app = new SoapExpressApp({});
      app.useMemoryMonitoring(config);

      const monitor = app.getMemoryMonitor();
      const middleware = app.getMemoryMiddleware();

      expect(monitor).toBeDefined();
      expect(middleware).toBeDefined();

      const stats = monitor!.getStats();
      const summary = monitor!.getSummary();

      expect(stats).toHaveProperty('current');
      expect(stats).toHaveProperty('history');
      expect(stats).toHaveProperty('leaks');
      expect(stats).toHaveProperty('uptime');
      expect(stats).toHaveProperty('lastCheck');

      expect(summary).toHaveProperty('current');
      expect(summary).toHaveProperty('status');
      expect(summary).toHaveProperty('leaks');
      expect(summary).toHaveProperty('uptime');
      expect(summary).toHaveProperty('lastCheck');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources on destroy', () => {
      const config: MemoryMonitoringConfig = {
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

      app = new SoapExpressApp({});
      app.useMemoryMonitoring(config);

      const monitor = app.getMemoryMonitor();
      const middleware = app.getMemoryMiddleware();

      expect(monitor).toBeDefined();
      expect(middleware).toBeDefined();

      // Destroy should clean up resources
      app.destroy();
      
      // Should not throw any errors
      expect(() => app.destroy()).not.toThrow();
    });
  });
});
