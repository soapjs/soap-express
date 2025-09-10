import { SoapExpressApp, HealthCheckPlugin } from '../src';
import request from 'supertest';

describe('Plugin System Integration Tests', () => {
  let app: SoapExpressApp;

  beforeEach(() => {
    app = new SoapExpressApp({});
  });

  afterEach(() => {
    if (app) {
      app.destroy();
    }
  });

  describe('Health Check Plugin', () => {
    it('should install and work correctly', async () => {
      // Install health check plugin
      app.usePlugin(new HealthCheckPlugin({
        path: '/health',
        timeout: 5000
      }));

      // Start server
      const server = await app.start(0);
      const port = server.address().port;

      // Test health check endpoint
      const response = await request(`http://localhost:${port}`)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        checks: expect.any(Object)
      });

      // Check that default health checks are present
      expect(response.body.checks).toHaveProperty('uptime');
      expect(response.body.checks).toHaveProperty('memory');
      expect(response.body.checks).toHaveProperty('process');

      server.close();
    });

    it('should support custom health checks', async () => {
      // Install health check plugin
      app.usePlugin(new HealthCheckPlugin({
        path: '/health',
        timeout: 5000
      }));

      // Add custom health check
      const healthPlugin = app.getPlugin('health-check') as HealthCheckPlugin;
      healthPlugin.addHealthCheck({
        name: 'custom',
        check: () => ({
          status: 'healthy',
          message: 'Custom check is working',
          data: { customData: 'test' }
        })
      });

      // Start server
      const server = await app.start(0);
      const port = server.address().port;

      // Test health check endpoint
      const response = await request(`http://localhost:${port}`)
        .get('/health')
        .expect(200);

      expect(response.body.checks).toHaveProperty('custom');
      expect(response.body.checks.custom).toMatchObject({
        status: 'healthy',
        message: 'Custom check is working',
        data: { customData: 'test' }
      });

      server.close();
    });

    it('should handle health check failures', async () => {
      // Install health check plugin
      app.usePlugin(new HealthCheckPlugin({
        path: '/health',
        timeout: 1000
      }));

      // Add failing health check
      const healthPlugin = app.getPlugin('health-check') as HealthCheckPlugin;
      healthPlugin.addHealthCheck({
        name: 'failing',
        check: () => {
          throw new Error('Health check failed');
        },
        critical: true
      });

      // Start server
      const server = await app.start(0);
      const port = server.address().port;

      // Test health check endpoint
      const response = await request(`http://localhost:${port}`)
        .get('/health')
        .expect(503);

      expect(response.body.status).toBe('error');
      expect(response.body.checks).toHaveProperty('failing');
      expect(response.body.checks.failing.status).toBe('unhealthy');

      server.close();
    });

    it('should support text response format', async () => {
      // Install health check plugin with text format
      app.usePlugin(new HealthCheckPlugin({
        path: '/health',
        responseFormat: 'text'
      }));

      // Start server
      const server = await app.start(0);
      const port = server.address().port;

      // Test health check endpoint
      const response = await request(`http://localhost:${port}`)
        .get('/health')
        .expect(200);

      expect(response.text).toContain('Status: ok');
      expect(response.text).toContain('Timestamp:');
      expect(response.text).toContain('Uptime:');

      server.close();
    });
  });

  describe('Plugin Management', () => {
    it('should list installed plugins', () => {
      // Install plugin
      app.usePlugin(new HealthCheckPlugin());

      // List plugins
      const plugins = app.listPlugins();
      expect(plugins).toHaveLength(1);
      expect(plugins[0].name).toBe('health-check');
    });

    it('should get specific plugin', () => {
      // Install plugin
      app.usePlugin(new HealthCheckPlugin());

      // Get plugin
      const plugin = app.getPlugin('health-check');
      expect(plugin).toBeDefined();
      expect(plugin?.name).toBe('health-check');
    });

    it('should check if plugin is loaded', () => {
      // Check before installation
      expect(app.isPluginLoaded('health-check')).toBe(false);

      // Install plugin
      app.usePlugin(new HealthCheckPlugin());

      // Check after installation
      expect(app.isPluginLoaded('health-check')).toBe(true);
    });

    it('should unload plugin', () => {
      // Install plugin
      app.usePlugin(new HealthCheckPlugin());
      expect(app.isPluginLoaded('health-check')).toBe(true);

      // Unload plugin
      app.unloadPlugin('health-check');
      expect(app.isPluginLoaded('health-check')).toBe(false);
    });
  });

  describe('Plugin Lifecycle', () => {
    it('should call lifecycle hooks', async () => {
      let beforeStartCalled = false;
      let afterStartCalled = false;

      // Create custom plugin with lifecycle hooks
      const lifecyclePlugin = {
        name: 'lifecycle-test',
        version: '1.0.0',
        install: jest.fn(),
        beforeStart: jest.fn(() => { beforeStartCalled = true; }),
        afterStart: jest.fn(() => { afterStartCalled = true; }),
        beforeStop: jest.fn(),
        afterStop: jest.fn()
      };

      // Install plugin
      app.usePlugin(lifecyclePlugin);

      // Start server
      const server = await app.start(0);
      expect(beforeStartCalled).toBe(true);
      expect(afterStartCalled).toBe(true);

      // Stop server
      server.close();
    });
  });

  describe('Multiple Plugins', () => {
    it('should handle multiple plugins', async () => {
      // Install multiple plugins
      app.usePlugin(new HealthCheckPlugin({ path: '/health' }));
      
      // Create second plugin
      const secondPlugin = {
        name: 'second-plugin',
        version: '1.0.0',
        install: (app: SoapExpressApp) => {
          app.getApp().get('/api/test', (req, res) => {
            res.json({ message: 'Second plugin working' });
          });
        }
      };
      
      app.usePlugin(secondPlugin);

      // Start server
      const server = await app.start(0);
      const port = server.address().port;

      // Test both plugins
      await request(`http://localhost:${port}`)
        .get('/health')
        .expect(200);

      await request(`http://localhost:${port}`)
        .get('/api/test')
        .expect(200)
        .expect({ message: 'Second plugin working' });

      server.close();
    });
  });
});
