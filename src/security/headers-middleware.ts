import { Request, Response, NextFunction } from 'express';
import { SecurityHeadersConfig, defaultSecurityHeadersConfig } from './types';

export class SecurityHeadersMiddleware {
  private config: SecurityHeadersConfig;

  constructor(config: SecurityHeadersConfig = defaultSecurityHeadersConfig) {
    this.config = { ...defaultSecurityHeadersConfig, ...config };
  }

  // Express middleware function
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enabled) {
        return next();
      }

      this.setSecurityHeaders(res);
      next();
    };
  }

  // Set security headers
  private setSecurityHeaders(res: Response): void {
    const headers = this.config.headers;

    // Content Security Policy
    if (headers.contentSecurityPolicy !== false) {
      res.setHeader('Content-Security-Policy', headers.contentSecurityPolicy || "default-src 'self'");
    }

    // X-Frame-Options
    if (headers.frameOptions !== false) {
      res.setHeader('X-Frame-Options', headers.frameOptions || 'DENY');
    }

    // X-Content-Type-Options
    if (headers.contentTypeOptions) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    // X-XSS-Protection
    if (headers.xssProtection !== false) {
      const xssValue = headers.xssProtection === true ? '1; mode=block' : headers.xssProtection;
      res.setHeader('X-XSS-Protection', xssValue || '1; mode=block');
    }

    // Referrer-Policy
    if (headers.referrerPolicy !== false) {
      res.setHeader('Referrer-Policy', headers.referrerPolicy || 'strict-origin-when-cross-origin');
    }

    // Strict-Transport-Security
    if (headers.strictTransportSecurity !== false) {
      res.setHeader('Strict-Transport-Security', headers.strictTransportSecurity || 'max-age=31536000; includeSubDomains');
    }

    // Permissions-Policy
    if (headers.permissionsPolicy !== false) {
      res.setHeader('Permissions-Policy', headers.permissionsPolicy || 'geolocation=(), microphone=(), camera=()');
    }

    // Cross-Origin-Embedder-Policy
    if (headers.crossOriginEmbedderPolicy !== false) {
      res.setHeader('Cross-Origin-Embedder-Policy', headers.crossOriginEmbedderPolicy || 'require-corp');
    }

    // Cross-Origin-Opener-Policy
    if (headers.crossOriginOpenerPolicy !== false) {
      res.setHeader('Cross-Origin-Opener-Policy', headers.crossOriginOpenerPolicy || 'same-origin');
    }

    // Cross-Origin-Resource-Policy
    if (headers.crossOriginResourcePolicy !== false) {
      res.setHeader('Cross-Origin-Resource-Policy', headers.crossOriginResourcePolicy || 'same-origin');
    }

    // Custom headers
    if (this.config.customHeaders) {
      Object.entries(this.config.customHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
    }
  }

  // Update configuration
  updateConfig(newConfig: Partial<SecurityHeadersConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current configuration
  getConfig(): SecurityHeadersConfig {
    return { ...this.config };
  }
}

// Factory function
export function createSecurityHeadersMiddleware(config?: SecurityHeadersConfig): SecurityHeadersMiddleware {
  return new SecurityHeadersMiddleware(config);
}

// Predefined security configurations
export const securityPresets = {
  // Strict security for production
  strict: {
    enabled: true,
    headers: {
      contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; media-src 'self'; object-src 'none'; child-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'self'",
      frameOptions: 'DENY',
      contentTypeOptions: true,
      xssProtection: '1; mode=block',
      referrerPolicy: 'strict-origin-when-cross-origin',
      strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
      permissionsPolicy: 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
      crossOriginEmbedderPolicy: 'require-corp',
      crossOriginOpenerPolicy: 'same-origin',
      crossOriginResourcePolicy: 'same-origin'
    }
  },
  
  // Balanced security for development
  balanced: {
    enabled: true,
    headers: {
      contentSecurityPolicy: "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws: wss:;",
      frameOptions: 'SAMEORIGIN',
      contentTypeOptions: true,
      xssProtection: '1; mode=block',
      referrerPolicy: 'strict-origin-when-cross-origin',
      strictTransportSecurity: false, // Disabled for development
      permissionsPolicy: 'geolocation=(), microphone=(), camera=()',
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: 'same-origin-allow-popups',
      crossOriginResourcePolicy: 'cross-origin'
    }
  },
  
  // Minimal security
  minimal: {
    enabled: true,
    headers: {
      contentSecurityPolicy: false,
      frameOptions: 'SAMEORIGIN',
      contentTypeOptions: true,
      xssProtection: '1',
      referrerPolicy: 'no-referrer-when-downgrade',
      strictTransportSecurity: false,
      permissionsPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false
    }
  }
};
