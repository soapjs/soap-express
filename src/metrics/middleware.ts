import { Request, Response, NextFunction } from 'express';
import { SoapMetricsCollector } from './collector';
import { MetricsConfig } from './types';

export class MetricsMiddleware {
  private collector: SoapMetricsCollector;

  constructor(config: MetricsConfig) {
    this.collector = new SoapMetricsCollector(config);
  }

  // Express middleware function
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      this.collector.withRequestContext(req, res, next);
    };
  }

  // Get the collector instance for custom metrics
  getCollector(): SoapMetricsCollector {
    return this.collector;
  }

  // Cleanup method
  destroy(): void {
    this.collector.destroy();
  }
}

// Factory function for easy creation
export function createMetricsMiddleware(config: MetricsConfig): MetricsMiddleware {
  return new MetricsMiddleware(config);
}

// Default configuration
export const defaultMetricsConfig: MetricsConfig = {
  enabled: true,
  metrics: {
    responseTime: true,
    requestCount: true,
    errorRate: true,
    memoryUsage: true,
    cpuUsage: true
  },
  collectInterval: 30000, // 30 seconds
  includeRouteParams: false,
  customLabels: {}
};
