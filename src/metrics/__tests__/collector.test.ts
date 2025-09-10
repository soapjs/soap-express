import { SoapMetricsCollector } from '../collector';
import { MetricsConfig, ConsoleMetricsClient } from '../types';

describe('SoapMetricsCollector', () => {
  let config: MetricsConfig;
  let collector: SoapMetricsCollector;

  beforeEach(() => {
    config = {
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
    collector = new SoapMetricsCollector(config);
  });

  afterEach(() => {
    collector.destroy();
  });

  describe('Built-in metrics', () => {
    it('should record response time', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      collector.recordResponseTime('/api/users', 'GET', 150);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[METRICS] Histogram: http_request_duration_seconds = 150',
        { route: '/api/users', method: 'GET' }
      );
      
      consoleSpy.mockRestore();
    });

    it('should record request count', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      collector.recordRequestCount('/api/users', 'POST', 201);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[METRICS] Counter: http_requests_total = 1',
        { route: '/api/users', method: 'POST', status_code: '201' }
      );
      
      consoleSpy.mockRestore();
    });

    it('should record error rate', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      collector.recordErrorRate('/api/users', 'GET', 'server_error');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[METRICS] Counter: http_errors_total = 1',
        { route: '/api/users', method: 'GET', error_type: 'server_error' }
      );
      
      consoleSpy.mockRestore();
    });

    it('should record memory usage', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      collector.recordMemoryUsage();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[METRICS] Gauge: process_memory_usage_bytes'),
        expect.any(Object)
      );
      
      consoleSpy.mockRestore();
    });

    it('should record CPU usage', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      collector.recordCpuUsage();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[METRICS] Gauge: process_cpu_usage_microseconds'),
        expect.any(Object)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Custom metrics', () => {
    it('should record counter', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      collector.counter('custom_counter', 5, { label1: 'value1' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[METRICS] Counter: custom_counter = 5',
        { label1: 'value1' }
      );
      
      consoleSpy.mockRestore();
    });

    it('should record histogram', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      collector.histogram('custom_histogram', 10.5, { label1: 'value1' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[METRICS] Histogram: custom_histogram = 10.5',
        { label1: 'value1' }
      );
      
      consoleSpy.mockRestore();
    });

    it('should record gauge', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      collector.gauge('custom_gauge', 100, { label1: 'value1' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[METRICS] Gauge: custom_gauge = 100',
        { label1: 'value1' }
      );
      
      consoleSpy.mockRestore();
    });

    it('should record summary', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      collector.summary('custom_summary', 25.3, { label1: 'value1' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[METRICS] Summary: custom_summary = 25.3',
        { label1: 'value1' }
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Configuration', () => {
    it('should not record metrics when disabled', () => {
      const disabledConfig: MetricsConfig = {
        ...config,
        enabled: false
      };
      const disabledCollector = new SoapMetricsCollector(disabledConfig);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      disabledCollector.recordResponseTime('/api/users', 'GET', 150);
      disabledCollector.counter('test_counter', 1);
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
      disabledCollector.destroy();
    });

    it('should not record specific metrics when disabled', () => {
      const partialConfig: MetricsConfig = {
        ...config,
        metrics: {
          responseTime: false,
          requestCount: true,
          errorRate: false,
          memoryUsage: false,
          cpuUsage: false
        }
      };
      const partialCollector = new SoapMetricsCollector(partialConfig);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      partialCollector.recordResponseTime('/api/users', 'GET', 150);
      partialCollector.recordRequestCount('/api/users', 'GET', 200);
      
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[METRICS] Counter: http_requests_total = 1',
        { route: '/api/users', method: 'GET', status_code: '200' }
      );
      
      consoleSpy.mockRestore();
      partialCollector.destroy();
    });
  });

  describe('Route sanitization', () => {
    it('should sanitize route parameters when enabled', () => {
      const configWithParams: MetricsConfig = {
        ...config,
        includeRouteParams: true
      };
      const collectorWithParams = new SoapMetricsCollector(configWithParams);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      collectorWithParams.recordResponseTime('/api/users/:id', 'GET', 150);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[METRICS] Histogram: http_request_duration_seconds = 150',
        { route: '/api/users/:param', method: 'GET' }
      );
      
      consoleSpy.mockRestore();
      collectorWithParams.destroy();
    });
  });
});
