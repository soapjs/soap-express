import { Request, Response } from 'express';
import { MetricsClient, MetricsCollector, MetricsConfig, ConsoleMetricsClient } from './types';

export class SoapMetricsCollector implements MetricsCollector {
  private client: MetricsClient;
  private config: MetricsConfig;
  private collectInterval?: NodeJS.Timeout;

  constructor(config: MetricsConfig) {
    this.config = config;
    this.client = config.client || new ConsoleMetricsClient();
    
    if (config.enabled && config.collectInterval) {
      this.startPeriodicCollection();
    }
  }

  // Built-in metrics
  recordResponseTime(route: string, method: string, duration: number): void {
    if (!this.config.enabled || !this.config.metrics.responseTime) return;
    
    this.histogram('http_request_duration_seconds', duration, {
      route: this.sanitizeRoute(route),
      method: method.toUpperCase()
    });
  }

  recordRequestCount(route: string, method: string, statusCode: number): void {
    if (!this.config.enabled || !this.config.metrics.requestCount) return;
    
    this.counter('http_requests_total', 1, {
      route: this.sanitizeRoute(route),
      method: method.toUpperCase(),
      status_code: statusCode.toString()
    });
  }

  recordErrorRate(route: string, method: string, errorType: string): void {
    if (!this.config.enabled || !this.config.metrics.errorRate) return;
    
    this.counter('http_errors_total', 1, {
      route: this.sanitizeRoute(route),
      method: method.toUpperCase(),
      error_type: errorType
    });
  }

  recordMemoryUsage(): void {
    if (!this.config.enabled || !this.config.metrics.memoryUsage) return;
    
    const memUsage = process.memoryUsage();
    const totalMem = require('os').totalmem();
    const usedMem = memUsage.heapUsed;
    const percentage = (usedMem / totalMem) * 100;

    this.gauge('process_memory_usage_bytes', usedMem, { type: 'heap_used' });
    this.gauge('process_memory_total_bytes', totalMem, { type: 'system_total' });
    this.gauge('process_memory_usage_percentage', percentage);
  }

  recordCpuUsage(): void {
    if (!this.config.enabled || !this.config.metrics.cpuUsage) return;
    
    const cpuUsage = process.cpuUsage();
    const totalCpu = cpuUsage.user + cpuUsage.system;
    
    this.gauge('process_cpu_usage_microseconds', totalCpu, { type: 'total' });
    this.gauge('process_cpu_user_microseconds', cpuUsage.user, { type: 'user' });
    this.gauge('process_cpu_system_microseconds', cpuUsage.system, { type: 'system' });
  }

  // Custom metrics
  counter(name: string, value: number = 1, labels?: Record<string, string | number>): void {
    if (!this.config.enabled) return;
    
    const enrichedLabels = this.enrichLabels(labels);
    this.client.counter(name, value, enrichedLabels);
  }

  histogram(name: string, value: number, labels?: Record<string, string | number>): void {
    if (!this.config.enabled) return;
    
    const enrichedLabels = this.enrichLabels(labels);
    this.client.histogram(name, value, enrichedLabels);
  }

  gauge(name: string, value: number, labels?: Record<string, string | number>): void {
    if (!this.config.enabled) return;
    
    const enrichedLabels = this.enrichLabels(labels);
    this.client.gauge(name, value, enrichedLabels);
  }

  summary(name: string, value: number, labels?: Record<string, string | number>): void {
    if (!this.config.enabled) return;
    
    const enrichedLabels = this.enrichLabels(labels);
    this.client.summary(name, value, enrichedLabels);
  }

  // Request context middleware
  withRequestContext(req: Request, res: Response, next: () => void): void {
    const startTime = Date.now();
    const route = this.extractRoute(req);
    const method = req.method;

    // Override res.end to capture response metrics
    const originalEnd = res.end;
    res.end = ((...args: any[]) => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Record metrics
      this.recordResponseTime(route, method, duration);
      this.recordRequestCount(route, method, statusCode);

      // Record error if status code indicates error
      if (statusCode >= 400) {
        this.recordErrorRate(route, method, this.getErrorType(statusCode));
      }

      // Call original end
      return originalEnd.apply(res, args);
    }) as any;

    next();
  }

  // Private methods
  private sanitizeRoute(route: string): string {
    if (!this.config.includeRouteParams) {
      return route;
    }
    
    // Replace route parameters with placeholders
    return route.replace(/:[^/]+/g, ':param');
  }

  private extractRoute(req: Request): string {
    return req.route?.path || req.path || req.url;
  }

  private getErrorType(statusCode: number): string {
    if (statusCode >= 500) return 'server_error';
    if (statusCode >= 400) return 'client_error';
    return 'unknown';
  }

  private enrichLabels(labels?: Record<string, string | number>): Record<string, string | number> {
    const enriched = { ...labels, ...this.config.customLabels };
    return enriched;
  }

  private startPeriodicCollection(): void {
    this.collectInterval = setInterval(() => {
      this.recordMemoryUsage();
      this.recordCpuUsage();
    }, this.config.collectInterval);
  }

  // Cleanup
  destroy(): void {
    if (this.collectInterval) {
      clearInterval(this.collectInterval);
    }
  }
}
