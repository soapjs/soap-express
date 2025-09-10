import { SoapExpressApp } from '../../app';
import { MetricsConfig, ConsoleMetricsClient } from '../types';

describe('Metrics Integration', () => {
  let app: SoapExpressApp;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    if (app) {
      app.destroy();
    }
    consoleSpy.mockRestore();
  });

  describe('useMetrics method', () => {
    it('should enable metrics collection', () => {
      const config: MetricsConfig = {
        enabled: true,
        metrics: {
          responseTime: true,
          requestCount: true,
          errorRate: true,
          memoryUsage: true,
          cpuUsage: true
        },
        client: new ConsoleMetricsClient()
      };

      app = new SoapExpressApp({});
      app.useMetrics(config);

      expect(app.getMetricsCollector()).toBeDefined();
      expect(app.getMetricsMiddleware()).toBeDefined();
    });

    it('should return app instance for chaining', () => {
      const config: MetricsConfig = {
        enabled: true,
        metrics: {
          responseTime: true,
          requestCount: true,
          errorRate: true,
          memoryUsage: true,
          cpuUsage: true
        }
      };

      app = new SoapExpressApp({});
      const result = app.useMetrics(config);

      expect(result).toBe(app);
    });
  });

  describe('Custom metrics usage', () => {
    it('should allow custom metrics recording', () => {
      const config: MetricsConfig = {
        enabled: true,
        metrics: {
          responseTime: false,
          requestCount: false,
          errorRate: false,
          memoryUsage: false,
          cpuUsage: false
        },
        client: new ConsoleMetricsClient()
      };

      app = new SoapExpressApp({});
      app.useMetrics(config);

      const collector = app.getMetricsCollector();
      collector!.counter('custom_api_requests', 1, { endpoint: '/test' });
      collector!.histogram('custom_response_time', 150, { endpoint: '/test' });
      collector!.gauge('custom_active_connections', 25);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[METRICS] Counter: custom_api_requests = 1',
        { endpoint: '/test' }
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[METRICS] Histogram: custom_response_time = 150',
        { endpoint: '/test' }
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[METRICS] Gauge: custom_active_connections = 25',
        {}
      );
    });
  });

  describe('Configuration options', () => {
    it('should respect custom labels', () => {
      const config: MetricsConfig = {
        enabled: true,
        metrics: {
          responseTime: true,
          requestCount: false,
          errorRate: false,
          memoryUsage: false,
          cpuUsage: false
        },
        customLabels: {
          service: 'test-service',
          version: '1.0.0'
        },
        client: new ConsoleMetricsClient()
      };

      app = new SoapExpressApp({});
      app.useMetrics(config);

      const collector = app.getMetricsCollector();
      collector!.recordResponseTime('/api/users', 'GET', 150);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[METRICS] Histogram: http_request_duration_seconds = 150',
        { 
          route: '/api/users', 
          method: 'GET',
          service: 'test-service',
          version: '1.0.0'
        }
      );
    });

    it('should respect route parameter inclusion', () => {
      const config: MetricsConfig = {
        enabled: true,
        metrics: {
          responseTime: true,
          requestCount: false,
          errorRate: false,
          memoryUsage: false,
          cpuUsage: false
        },
        includeRouteParams: true,
        client: new ConsoleMetricsClient()
      };

      app = new SoapExpressApp({});
      app.useMetrics(config);

      const collector = app.getMetricsCollector();
      collector!.recordResponseTime('/api/users/:id', 'GET', 150);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[METRICS] Histogram: http_request_duration_seconds = 150',
        { 
          route: '/api/users/:param', 
          method: 'GET'
        }
      );
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources on destroy', () => {
      const config: MetricsConfig = {
        enabled: true,
        metrics: {
          responseTime: true,
          requestCount: true,
          errorRate: true,
          memoryUsage: true,
          cpuUsage: true
        },
        collectInterval: 1000 // 1 second for testing
      };

      app = new SoapExpressApp({});
      app.useMetrics(config);

      // Start periodic collection
      const collector = app.getMetricsCollector();
      expect(collector).toBeDefined();

      // Destroy should clean up intervals
      app.destroy();
      
      // Should not throw any errors
      expect(() => app.destroy()).not.toThrow();
    });
  });
});
