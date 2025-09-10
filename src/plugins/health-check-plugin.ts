import { Request, Response } from 'express';
import { SoapExpressPlugin, HealthCheckOptions, HealthCheck, HealthCheckResult, HealthCheckResponse } from '../types/plugin';
import { SoapExpressApp } from '../app';

export class HealthCheckPlugin implements SoapExpressPlugin {
  readonly name = 'health-check';
  readonly version = '1.0.0';
  readonly description = 'Basic health check plugin for SoapExpress';
  readonly author = 'SoapJS Team';
  readonly category = 'monitoring';
  readonly tags = ['health', 'monitoring', 'status'];

  private options: HealthCheckOptions;
  private startTime: number;

  constructor(options: HealthCheckOptions = {}) {
    this.options = {
      path: '/health',
      timeout: 5000,
      responseFormat: 'json',
      checks: [],
      ...options
    };
    this.startTime = Date.now();
  }

  install(app: SoapExpressApp, options?: HealthCheckOptions): void {
    // Merge options
    if (options) {
      this.options = { ...this.options, ...options };
    }

    // Add default health checks
    this.addDefaultHealthChecks();

    // Register health check route
    this.registerHealthCheckRoute(app);

    console.log(`HealthCheck plugin installed with path: ${this.options.path}`);
  }

  uninstall(app: SoapExpressApp): void {
    // Remove health check route
    const expressApp = app.getApp();
    const routes = expressApp._router.stack;
    
    // Find and remove health check route
    for (let i = routes.length - 1; i >= 0; i--) {
      const route = routes[i];
      if (route.route && route.route.path === this.options.path) {
        routes.splice(i, 1);
        break;
      }
    }

    console.log(`HealthCheck plugin uninstalled`);
  }

  beforeStart(app: SoapExpressApp): void {
    console.log('HealthCheck plugin: Application starting...');
  }

  afterStart(app: SoapExpressApp): void {
    console.log('HealthCheck plugin: Application started successfully');
  }

  beforeStop(app: SoapExpressApp): void {
    console.log('HealthCheck plugin: Application stopping...');
  }

  afterStop(app: SoapExpressApp): void {
    console.log('HealthCheck plugin: Application stopped');
  }

  // Add a custom health check
  addHealthCheck(check: HealthCheck): void {
    this.options.checks = this.options.checks || [];
    this.options.checks.push(check);
  }

  // Remove a health check by name
  removeHealthCheck(name: string): void {
    if (this.options.checks) {
      this.options.checks = this.options.checks.filter(check => check.name !== name);
    }
  }

  // Get all health checks
  getHealthChecks(): HealthCheck[] {
    return this.options.checks || [];
  }

  private addDefaultHealthChecks(): void {
    // Basic uptime check
    this.addHealthCheck({
      name: 'uptime',
      check: () => ({
        status: 'healthy',
        message: 'Application is running',
        data: {
          uptime: Date.now() - this.startTime,
          uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000)
        },
        timestamp: new Date().toISOString()
      }),
      critical: true
    });

    // Memory usage check
    this.addHealthCheck({
      name: 'memory',
      check: () => {
        const memUsage = process.memoryUsage();
        const memUsageMB = {
          rss: Math.round(memUsage.rss / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024)
        };

        return {
          status: 'healthy',
          message: 'Memory usage is normal',
          data: memUsageMB,
          timestamp: new Date().toISOString()
        };
      }
    });

    // Process check
    this.addHealthCheck({
      name: 'process',
      check: () => ({
        status: 'healthy',
        message: 'Process is running normally',
        data: {
          pid: process.pid,
          platform: process.platform,
          nodeVersion: process.version,
          arch: process.arch
        },
        timestamp: new Date().toISOString()
      })
    });
  }

  private registerHealthCheckRoute(app: SoapExpressApp): void {
    const expressApp = app.getApp();
    
    expressApp.get(this.options.path!, async (req: Request, res: Response) => {
      try {
        const healthResponse = await this.performHealthChecks();
        
        if (this.options.responseFormat === 'text') {
          res.set('Content-Type', 'text/plain');
          res.status(healthResponse.status === 'ok' ? 200 : 503);
          res.send(this.formatTextResponse(healthResponse));
        } else {
          res.set('Content-Type', 'application/json');
          res.status(healthResponse.status === 'ok' ? 200 : 503);
          res.json(healthResponse);
        }
      } catch (error) {
        const errorResponse: HealthCheckResponse = {
          status: 'error',
          timestamp: new Date().toISOString(),
          uptime: Date.now() - this.startTime,
          checks: {
            error: {
              status: 'unhealthy',
              message: error.message,
              timestamp: new Date().toISOString()
            }
          }
        };

        res.set('Content-Type', 'application/json');
        res.status(503).json(errorResponse);
      }
    });
  }

  private async performHealthChecks(): Promise<HealthCheckResponse> {
    const checks: Record<string, HealthCheckResult> = {};
    let overallStatus: 'ok' | 'error' | 'degraded' = 'ok';

    if (!this.options.checks || this.options.checks.length === 0) {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        checks: {}
      };
    }

    // Run all health checks
    for (const check of this.options.checks) {
      try {
        const result = await this.runHealthCheck(check);
        checks[check.name] = result;

        // Update overall status
        if (result.status === 'unhealthy' && check.critical) {
          overallStatus = 'error';
        } else if (result.status === 'unhealthy' && overallStatus === 'ok') {
          overallStatus = 'degraded';
        } else if (result.status === 'degraded' && overallStatus === 'ok') {
          overallStatus = 'degraded';
        }
      } catch (error) {
        checks[check.name] = {
          status: 'unhealthy',
          message: error.message,
          timestamp: new Date().toISOString()
        };

        if (check.critical) {
          overallStatus = 'error';
        } else if (overallStatus === 'ok') {
          overallStatus = 'degraded';
        }
      }
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      checks,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
  }

  private async runHealthCheck(check: HealthCheck): Promise<HealthCheckResult> {
    const timeout = check.timeout || this.options.timeout || 5000;
    
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Health check '${check.name}' timed out after ${timeout}ms`));
      }, timeout);

      try {
        const result = check.check();
        
        if (result instanceof Promise) {
          result
            .then((res) => {
              clearTimeout(timer);
              resolve({
                ...res,
                timestamp: res.timestamp || new Date().toISOString()
              });
            })
            .catch((error) => {
              clearTimeout(timer);
              reject(error);
            });
        } else {
          clearTimeout(timer);
          resolve({
            ...result,
            timestamp: result.timestamp || new Date().toISOString()
          });
        }
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  private formatTextResponse(response: HealthCheckResponse): string {
    let text = `Status: ${response.status}\n`;
    text += `Timestamp: ${response.timestamp}\n`;
    text += `Uptime: ${response.uptime}ms\n`;
    
    if (response.version) {
      text += `Version: ${response.version}\n`;
    }
    
    if (response.environment) {
      text += `Environment: ${response.environment}\n`;
    }

    if (Object.keys(response.checks).length > 0) {
      text += '\nChecks:\n';
      for (const [name, check] of Object.entries(response.checks)) {
        text += `  ${name}: ${check.status}`;
        if (check.message) {
          text += ` - ${check.message}`;
        }
        text += '\n';
      }
    }

    return text;
  }
}

// Export default instance
export default HealthCheckPlugin;
