import { MemoryMonitor } from '../memory-monitor';
import { MemoryMonitoringConfig, parseMemoryThreshold, formatBytes } from '../types';

describe('MemoryMonitor', () => {
  let config: MemoryMonitoringConfig;
  let monitor: MemoryMonitor;

  beforeEach(() => {
    jest.useFakeTimers();
    config = {
      enabled: true,
      interval: 100, // Fast interval for testing
      threshold: {
        used: 1024 * 1024 * 1024, // 1GB - much higher threshold
        percentage: 90,
        heapUsed: 512 * 1024 * 1024, // 512MB
        rss: 1024 * 1024 * 1024 // 1GB
      },
      leakDetection: {
        enabled: true,
        consecutiveGrowths: 2,
        growthThreshold: 5,
        maxHistory: 10
      }
    };
    monitor = new MemoryMonitor(config);
  });

  afterEach(() => {
    if (monitor) {
      monitor.destroy();
    }
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Basic functionality', () => {
    it('should create monitor instance', () => {
      expect(monitor).toBeDefined();
      expect(monitor.getCurrentMemoryInfo()).toBeDefined();
    });

    it('should get current memory info', () => {
      const memoryInfo = monitor.getCurrentMemoryInfo();
      expect(memoryInfo).toHaveProperty('used');
      expect(memoryInfo).toHaveProperty('percentage');
      expect(memoryInfo).toHaveProperty('heapUsed');
      expect(memoryInfo).toHaveProperty('rss');
      expect(memoryInfo).toHaveProperty('external');
      expect(memoryInfo).toHaveProperty('arrayBuffers');
    });

    it('should get stats', () => {
      const stats = monitor.getStats();
      expect(stats).toHaveProperty('current');
      expect(stats).toHaveProperty('history');
      expect(stats).toHaveProperty('leaks');
    });

    it('should get summary', () => {
      const summary = monitor.getSummary();
      expect(summary).toHaveProperty('current');
      expect(summary).toHaveProperty('status');
      expect(summary).toHaveProperty('leaks');
    });
  });

  describe('Memory leak detection', () => {
    it('should detect memory leaks with consecutive growths', () => {
      const onLeakSpy = jest.fn();
      const leakConfig: MemoryMonitoringConfig = {
        enabled: true,
        interval: 100,
        threshold: {
          used: 1024 * 1024 * 1024, // 1GB
          percentage: 90,
          heapUsed: 512 * 1024 * 1024, // 512MB
          rss: 1024 * 1024 * 1024 // 1GB
        },
        onLeak: onLeakSpy,
        leakDetection: {
          enabled: true,
          consecutiveGrowths: 2,
          growthThreshold: 0.01, // Very low threshold for testing (0.01%)
          maxHistory: 10
        }
      };
      
      const leakMonitor = new MemoryMonitor(leakConfig);
      
      // Simulate memory growth by creating objects
      const createObjects = () => {
        const objects = [];
        for (let i = 0; i < 50000; i++) {
          objects.push(new Array(1000).fill('test-data-' + Math.random()));
        }
        return objects;
      };
      
      // Create objects to increase memory multiple times with longer intervals
      createObjects();
      jest.advanceTimersByTime(200); // Wait for first measurement
      createObjects();
      jest.advanceTimersByTime(200); // Wait for second measurement
      createObjects();
      jest.advanceTimersByTime(200); // Wait for third measurement
      createObjects();
      jest.advanceTimersByTime(200); // Wait for fourth measurement
      createObjects();
      jest.advanceTimersByTime(200); // Wait for fifth measurement
      
      expect(onLeakSpy).toHaveBeenCalled();
      leakMonitor.destroy();
    });

    it('should not detect leaks when growth is below threshold', () => {
      const onLeakSpy = jest.fn();
      const noLeakConfig: MemoryMonitoringConfig = {
        ...config,
        onLeak: onLeakSpy,
        leakDetection: {
          enabled: true,
          consecutiveGrowths: 2,
          growthThreshold: 50, // High threshold
          maxHistory: 10
        }
      };
      
      const noLeakMonitor = new MemoryMonitor(noLeakConfig);
      
      // Fast forward timers
      jest.advanceTimersByTime(1000);
      
      expect(onLeakSpy).not.toHaveBeenCalled();
      noLeakMonitor.destroy();
    });
  });

  describe('Threshold monitoring', () => {
    it('should trigger threshold warning when exceeded', () => {
      const onThresholdSpy = jest.fn();
      const thresholdConfig: MemoryMonitoringConfig = {
        ...config,
        onThreshold: onThresholdSpy,
        threshold: {
          used: 1, // Very low threshold
          percentage: 0.1,
          heapUsed: 1,
          rss: 1
        }
      };
      
      const thresholdMonitor = new MemoryMonitor(thresholdConfig);
      
      // Fast forward timers to trigger threshold check
      jest.advanceTimersByTime(1000);
      
      expect(onThresholdSpy).toHaveBeenCalled();
      thresholdMonitor.destroy();
    });
  });

  describe('Configuration updates', () => {
    it('should update configuration', () => {
      const newConfig = {
        enabled: false,
        interval: 200
      };
      
      monitor.updateConfig(newConfig);
      
      const updatedConfig = monitor.getConfig();
      expect(updatedConfig.enabled).toBe(false);
      expect(updatedConfig.interval).toBe(200);
    });
  });

  describe('Garbage collection', () => {
    it('should handle force GC gracefully', () => {
      // This should not throw an error
      expect(() => monitor.forceGC()).not.toThrow();
    });
  });

  describe('History management', () => {
    it('should limit history size', () => {
      const limitedConfig: MemoryMonitoringConfig = {
        ...config,
        leakDetection: {
          enabled: true,
          consecutiveGrowths: 2,
          growthThreshold: 5,
          maxHistory: 3
        }
      };
      
      const limitedMonitor = new MemoryMonitor(limitedConfig);
      
      // Fast forward timers to generate history
      jest.advanceTimersByTime(1000);
      
      const stats = limitedMonitor.getStats();
      expect(stats.history.length).toBeLessThanOrEqual(3);
      
      limitedMonitor.destroy();
    });
  });
});

describe('Utility functions', () => {
  describe('parseMemoryThreshold', () => {
    it('should parse bytes correctly', () => {
      expect(parseMemoryThreshold('1024')).toBe(1024);
    });

    it('should parse KB correctly', () => {
      expect(parseMemoryThreshold('1KB')).toBe(1024);
      expect(parseMemoryThreshold('2KB')).toBe(2048);
    });

    it('should parse MB correctly', () => {
      expect(parseMemoryThreshold('1MB')).toBe(1024 * 1024);
      expect(parseMemoryThreshold('2MB')).toBe(2 * 1024 * 1024);
    });

    it('should parse GB correctly', () => {
      expect(parseMemoryThreshold('1GB')).toBe(1024 * 1024 * 1024);
      expect(parseMemoryThreshold('2GB')).toBe(2 * 1024 * 1024 * 1024);
    });

    it('should throw error for invalid format', () => {
      expect(() => parseMemoryThreshold('invalid')).toThrow();
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(1024)).toBe('1.00 KB');
      expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
    });

    it('should handle small values', () => {
      expect(formatBytes(512)).toBe('512.00 B');
      expect(formatBytes(0)).toBe('0.00 B');
    });
  });
});