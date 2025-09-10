import { Request, Response, NextFunction } from 'express';
import { MemoryMonitor } from './memory-monitor';
import { MemoryMonitoringConfig, defaultMemoryConfig } from './types';

// Extend Request interface to include memoryInfo
declare global {
  namespace Express {
    interface Request {
      memoryInfo?: any;
    }
  }
}

export class MemoryMonitoringMiddleware {
  private monitor: MemoryMonitor;

  constructor(config: MemoryMonitoringConfig) {
    this.monitor = new MemoryMonitor(config);
  }

  // Express middleware function
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Add memory info to request for debugging
      req.memoryInfo = this.monitor.getCurrentMemoryInfo();
      
      next();
    };
  }

  // Get the monitor instance
  getMonitor(): MemoryMonitor {
    return this.monitor;
  }

  // Get current memory stats
  getStats() {
    return this.monitor.getStats();
  }

  // Get memory summary
  getSummary() {
    return this.monitor.getSummary();
  }

  // Force garbage collection
  forceGC() {
    this.monitor.forceGC();
  }

  // Cleanup
  destroy(): void {
    this.monitor.destroy();
  }
}

// Factory function for easy creation
export function createMemoryMonitoringMiddleware(config: MemoryMonitoringConfig): MemoryMonitoringMiddleware {
  return new MemoryMonitoringMiddleware(config);
}

// Helper function to create config from simple options
export function createMemoryConfig(options: {
  threshold?: string | number;
  interval?: number;
  onLeak?: (info: any) => void;
  onThreshold?: (info: any) => void;
}): MemoryMonitoringConfig {
  const threshold = typeof options.threshold === 'string' 
    ? parseMemoryThreshold(options.threshold)
    : options.threshold || 512 * 1024 * 1024; // 512MB default

  return {
    ...defaultMemoryConfig,
    threshold: {
      used: threshold,
      percentage: 80,
      heapUsed: threshold / 2,
      rss: threshold
    },
    interval: options.interval || 30000,
    onLeak: options.onLeak,
    onThreshold: options.onThreshold
  };
}

// Import parseMemoryThreshold for the helper function
import { parseMemoryThreshold } from './types';
