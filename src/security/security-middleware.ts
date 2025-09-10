import { Request, Response, NextFunction } from 'express';
import { SecurityConfig, defaultSecurityConfig, SecurityContext } from './types';
import { SecurityHeadersMiddleware } from './headers-middleware';
import { CSRFMiddleware } from './csrf-middleware';
import { SanitizationMiddleware } from './sanitization-middleware';

export class SecurityMiddleware {
  private config: SecurityConfig;
  private headersMiddleware: SecurityHeadersMiddleware;
  private csrfMiddleware: CSRFMiddleware;
  private sanitizationMiddleware: SanitizationMiddleware;

  constructor(config: SecurityConfig = defaultSecurityConfig) {
    this.config = { ...defaultSecurityConfig, ...config };
    
    // Initialize sub-middlewares
    this.headersMiddleware = new SecurityHeadersMiddleware(this.config.headers);
    this.csrfMiddleware = new CSRFMiddleware(this.config.csrf);
    this.sanitizationMiddleware = new SanitizationMiddleware(this.config.sanitization);
  }

  // Main security middleware
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enabled) {
        return next();
      }

      // Add security context to request
      this.addSecurityContext(req);

      // Apply security headers
      this.headersMiddleware.middleware()(req, res, (err) => {
        if (err) return next(err);

        // Apply CSRF protection
        this.csrfMiddleware.middleware()(req, res, (err) => {
          if (err) return next(err);

          // Apply input sanitization
          this.sanitizationMiddleware.middleware()(req, res, next);
        });
      });
    };
  }

  // Add security context to request
  private addSecurityContext(req: Request): void {
    const context: SecurityContext = {
      isSecure: req.secure || req.headers['x-forwarded-proto'] === 'https',
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      referer: req.headers.referer as string,
      origin: req.headers.origin as string
    };

    // Attach to request
    (req as any).securityContext = context;
  }

  // Get security headers middleware
  getHeadersMiddleware(): SecurityHeadersMiddleware {
    return this.headersMiddleware;
  }

  // Get CSRF middleware
  getCSRFMiddleware(): CSRFMiddleware {
    return this.csrfMiddleware;
  }

  // Get sanitization middleware
  getSanitizationMiddleware(): SanitizationMiddleware {
    return this.sanitizationMiddleware;
  }

  // Get security violations
  getSecurityViolations() {
    return this.sanitizationMiddleware.getViolations();
  }

  // Get security statistics
  getSecurityStats() {
    return {
      violations: this.sanitizationMiddleware.getViolationStats(),
      config: this.config
    };
  }

  // Update configuration
  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update sub-middlewares
    if (newConfig.headers) {
      this.headersMiddleware.updateConfig(newConfig.headers);
    }
    if (newConfig.csrf) {
      this.csrfMiddleware.updateConfig(newConfig.csrf);
    }
    if (newConfig.sanitization) {
      this.sanitizationMiddleware.updateConfig(newConfig.sanitization);
    }
  }

  // Get current configuration
  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  // Clear security violations
  clearViolations(): void {
    this.sanitizationMiddleware.clearViolations();
  }
}

// Factory function
export function createSecurityMiddleware(config?: SecurityConfig): SecurityMiddleware {
  return new SecurityMiddleware(config);
}

// Security endpoints helper
export function createSecurityEndpoints(securityMiddleware: SecurityMiddleware) {
  return {
    // CSRF token endpoint
    csrfToken: (req: Request, res: Response) => {
      const csrfMiddleware = securityMiddleware.getCSRFMiddleware();
      const token = csrfMiddleware.generateToken();
      res.json({ csrfToken: token });
    },

    // Security violations endpoint
    violations: (req: Request, res: Response) => {
      const violations = securityMiddleware.getSecurityViolations();
      const stats = securityMiddleware.getSecurityStats();
      
      res.json({
        violations,
        stats,
        timestamp: new Date().toISOString()
      });
    },

    // Security status endpoint
    status: (req: Request, res: Response) => {
      const config = securityMiddleware.getConfig();
      const stats = securityMiddleware.getSecurityStats();
      
      res.json({
        enabled: config.enabled,
        features: {
          headers: config.headers?.enabled || false,
          csrf: config.csrf?.enabled || false,
          sanitization: config.sanitization?.enabled || false
        },
        stats,
        timestamp: new Date().toISOString()
      });
    }
  };
}
