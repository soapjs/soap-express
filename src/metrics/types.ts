import { Request, Response } from 'express';

// Base interfaces for metrics system
export interface MetricsClient {
  counter(name: string, value?: number, labels?: Record<string, string | number>): void;
  histogram(name: string, value: number, labels?: Record<string, string | number>): void;
  gauge(name: string, value: number, labels?: Record<string, string | number>): void;
  summary(name: string, value: number, labels?: Record<string, string | number>): void;
}

export interface MetricsCollector {
  // Built-in metrics
  recordResponseTime(route: string, method: string, duration: number): void;
  recordRequestCount(route: string, method: string, statusCode: number): void;
  recordErrorRate(route: string, method: string, errorType: string): void;
  recordMemoryUsage(): void;
  recordCpuUsage(): void;
  
  // Custom metrics
  counter(name: string, value?: number, labels?: Record<string, string | number>): void;
  histogram(name: string, value: number, labels?: Record<string, string | number>): void;
  gauge(name: string, value: number, labels?: Record<string, string | number>): void;
  summary(name: string, value: number, labels?: Record<string, string | number>): void;
  
  // Request context
  withRequestContext(req: Request, res: Response, next: () => void): void;
}

export interface MetricsConfig {
  enabled: boolean;
  metrics: {
    responseTime: boolean;
    requestCount: boolean;
    errorRate: boolean;
    memoryUsage: boolean;
    cpuUsage: boolean;
  };
  client?: MetricsClient;
  collectInterval?: number; // in milliseconds
  includeRouteParams?: boolean;
  customLabels?: Record<string, string | number>;
}

export interface MetricsData {
  timestamp: number;
  type: 'counter' | 'histogram' | 'gauge' | 'summary';
  name: string;
  value: number;
  labels: Record<string, string | number>;
}

export interface BuiltInMetrics {
  responseTime: {
    route: string;
    method: string;
    duration: number;
  };
  requestCount: {
    route: string;
    method: string;
    statusCode: number;
  };
  errorRate: {
    route: string;
    method: string;
    errorType: string;
  };
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage: {
    percentage: number;
  };
}

// Default console client for development
export class ConsoleMetricsClient implements MetricsClient {
  counter(name: string, value: number = 1, labels?: Record<string, string | number>): void {
    console.log(`[METRICS] Counter: ${name} = ${value}`, labels || '');
  }

  histogram(name: string, value: number, labels?: Record<string, string | number>): void {
    console.log(`[METRICS] Histogram: ${name} = ${value}`, labels || '');
  }

  gauge(name: string, value: number, labels?: Record<string, string | number>): void {
    console.log(`[METRICS] Gauge: ${name} = ${value}`, labels || '');
  }

  summary(name: string, value: number, labels?: Record<string, string | number>): void {
    console.log(`[METRICS] Summary: ${name} = ${value}`, labels || '');
  }
}
