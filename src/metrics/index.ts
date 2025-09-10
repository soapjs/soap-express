// Main metrics exports
export { SoapMetricsCollector } from './collector';
export { MetricsMiddleware, createMetricsMiddleware, defaultMetricsConfig } from './middleware';

// Types
export type {
  MetricsClient,
  MetricsCollector,
  MetricsConfig,
  MetricsData,
  BuiltInMetrics
} from './types';

// Default clients
export { ConsoleMetricsClient } from './types';
