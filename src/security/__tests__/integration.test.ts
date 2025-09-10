import { SoapExpressApp } from '../../app';
import { SecurityConfig, defaultSecurityConfig } from '../types';
import { securityPresets } from '../headers-middleware';

describe('Security Integration', () => {
  let app: SoapExpressApp;

  afterEach(() => {
    if (app) {
      app.destroy();
    }
  });

  describe('useSecurity method', () => {
    it('should enable security middleware', () => {
      const config: SecurityConfig = {
        enabled: true,
        headers: {
          enabled: true,
          headers: {
            contentSecurityPolicy: "default-src 'self'",
            frameOptions: 'DENY',
            contentTypeOptions: true
          }
        },
        csrf: {
          enabled: true,
          secret: 'test-secret',
          cookieName: '_csrf'
        },
        sanitization: {
          enabled: true,
          options: {
            stripHtml: true,
            escapeHtml: true,
            preventPathTraversal: true
          }
        }
      };

      app = new SoapExpressApp({});
      app.useSecurity(config);

      expect(app.getSecurityMiddleware()).toBeDefined();
    });

    it('should return app instance for chaining', () => {
      const config: SecurityConfig = {
        enabled: true,
        headers: { enabled: true, headers: {} },
        csrf: { enabled: true, secret: 'test-secret' },
        sanitization: { enabled: true, options: {} }
      };

      app = new SoapExpressApp({});
      const result = app.useSecurity(config);

      expect(result).toBe(app);
    });
  });

  describe('Security with routes', () => {
    it('should apply security headers to responses', async () => {
      const config: SecurityConfig = {
        enabled: true,
        headers: {
          enabled: true,
          headers: {
            contentSecurityPolicy: "default-src 'self'",
            frameOptions: 'DENY',
            contentTypeOptions: true
          }
        },
        csrf: { enabled: false, secret: 'test' },
        sanitization: { enabled: false, options: {} }
      };

      app = new SoapExpressApp({});
      app.useSecurity(config);

      // Add a route
      app.getApp().get('/api/test', (req, res) => {
        res.json({ success: true });
      });

      // Start server and make request
      await app.start(3002);
      
      const http = require('http');
      const response = await new Promise((resolve, reject) => {
        const req = http.get('http://localhost:3002/api/test', (res) => {
          resolve(res);
        });
        req.on('error', reject);
      });

      expect((response as any).headers['content-security-policy']).toBe("default-src 'self'");
      expect((response as any).headers['x-frame-options']).toBe('DENY');
      expect((response as any).headers['x-content-type-options']).toBe('nosniff');
    });

    it('should sanitize request data', async () => {
      const config: SecurityConfig = {
        enabled: true,
        headers: { enabled: false, headers: {} },
        csrf: { enabled: false, secret: 'test' },
        sanitization: {
          enabled: true,
          options: {
            stripHtml: true,
            escapeHtml: true,
            preventPathTraversal: true
          }
        }
      };

      app = new SoapExpressApp({});
      app.useSecurity(config);

      // Add a route that echoes back the request data
      app.getApp().post('/api/echo', (req, res) => {
        res.json({ received: req.body });
      });

      await app.start(3003);
      
      const http = require('http');
      const postData = JSON.stringify({
        name: '<script>alert("xss")</script>',
        path: '../../../etc/passwd'
      });

      const response = await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: 'localhost',
          port: 3003,
          path: '/api/echo',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
      });

      expect((response as any).received.name).toBe('alert("xss")');
      expect((response as any).received.path).toBe('etc/passwd');
    });
  });

  describe('Security presets', () => {
    it('should work with strict preset', () => {
      const config: SecurityConfig = {
        ...defaultSecurityConfig,
        headers: securityPresets.strict as any
      };

      app = new SoapExpressApp({});
      app.useSecurity(config);

      expect(app.getSecurityMiddleware()).toBeDefined();
    });

    it('should work with balanced preset', () => {
      const config: SecurityConfig = {
        ...defaultSecurityConfig,
        headers: securityPresets.balanced as any
      };

      app = new SoapExpressApp({});
      app.useSecurity(config);

      expect(app.getSecurityMiddleware()).toBeDefined();
    });

    it('should work with minimal preset', () => {
      const config: SecurityConfig = {
        ...defaultSecurityConfig,
        headers: securityPresets.minimal as any
      };

      app = new SoapExpressApp({});
      app.useSecurity(config);

      expect(app.getSecurityMiddleware()).toBeDefined();
    });
  });

  describe('Security endpoints', () => {
    it('should provide security status endpoint', async () => {
      const config: SecurityConfig = {
        enabled: true,
        headers: { enabled: true, headers: {} },
        csrf: { enabled: true, secret: 'test-secret' },
        sanitization: { enabled: true, options: {} }
      };

      app = new SoapExpressApp({});
      app.useSecurity(config);

      // Add security endpoints
      const securityMiddleware = app.getSecurityMiddleware()!;
      const endpoints = require('../security-middleware').createSecurityEndpoints(securityMiddleware);
      
      app.getApp().get('/security/status', endpoints.status);
      app.getApp().get('/security/csrf-token', endpoints.csrfToken);
      app.getApp().get('/security/violations', endpoints.violations);

      await app.start(3004);
      
      const http = require('http');
      const response = await new Promise((resolve, reject) => {
        const req = http.get('http://localhost:3004/security/status', (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
      });

      expect((response as any).enabled).toBe(true);
      expect((response as any).features.headers).toBe(true);
      expect((response as any).features.csrf).toBe(true);
      expect((response as any).features.sanitization).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources on destroy', () => {
      const config: SecurityConfig = {
        enabled: true,
        headers: { enabled: true, headers: {} },
        csrf: { enabled: true, secret: 'test-secret' },
        sanitization: { enabled: true, options: {} }
      };

      app = new SoapExpressApp({});
      app.useSecurity(config);

      const securityMiddleware = app.getSecurityMiddleware();
      expect(securityMiddleware).toBeDefined();

      // Destroy should clean up resources
      app.destroy();
      
      // Should not throw any errors
      expect(() => app.destroy()).not.toThrow();
    });
  });
});
