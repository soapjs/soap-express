import { Request, Response, NextFunction } from 'express';
import { CSRFConfig, defaultCSRFConfig, generateCSRFToken, hashToken, verifyCSRFToken } from './types';

export class CSRFMiddleware {
  private config: CSRFConfig;

  constructor(config: CSRFConfig = defaultCSRFConfig) {
    this.config = { ...defaultCSRFConfig, ...config };
  }

  // Express middleware function
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enabled) {
        return next();
      }

      // Skip CSRF check for ignored methods and paths
      if (this.shouldSkipCSRF(req)) {
        return next();
      }

      // Generate and set CSRF token if not present
      this.ensureCSRFToken(req, res);

      // Verify CSRF token for state-changing methods
      if (this.requiresCSRFVerification(req)) {
        if (!this.verifyCSRFToken(req)) {
          return this.handleCSRFError(res);
        }
      }

      next();
    };
  }

  // Check if request should skip CSRF verification
  private shouldSkipCSRF(req: Request): boolean {
    // Skip ignored paths
    if (this.config.ignorePaths) {
      for (const path of this.config.ignorePaths) {
        if (req.path.startsWith(path)) {
          return true;
        }
      }
    }

    return false;
  }

  // Check if request requires CSRF verification
  private requiresCSRFVerification(req: Request): boolean {
    const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    return stateChangingMethods.includes(req.method);
  }

  // Ensure CSRF token is present in request
  private ensureCSRFToken(req: Request, res: Response): void {
    const cookieName = this.config.cookieName!;
    let token = req.cookies?.[cookieName];

    if (!token) {
      // Generate new token
      token = generateCSRFToken(this.config.tokenLength!);
      const hashedToken = hashToken(token, this.config.secret);
      
      // Set cookie with hashed token
      res.cookie(cookieName, hashedToken, {
        ...this.config.cookieOptions,
        secure: this.config.cookieOptions?.secure ?? false,
        httpOnly: this.config.cookieOptions?.httpOnly ?? true,
        sameSite: this.config.cookieOptions?.sameSite ?? 'strict',
        maxAge: this.config.cookieOptions?.maxAge ?? 3600000
      });

      // Store token in response for client access
      res.locals.csrfToken = token;
    } else {
      // Token exists, verify it's valid
      const isValid = this.verifyStoredToken(token);
      if (!isValid) {
        // Generate new token if stored one is invalid
        token = generateCSRFToken(this.config.tokenLength!);
        const hashedToken = hashToken(token, this.config.secret);
        
        res.cookie(cookieName, hashedToken, {
          ...this.config.cookieOptions,
          secure: this.config.cookieOptions?.secure ?? false,
          httpOnly: this.config.cookieOptions?.httpOnly ?? true,
          sameSite: this.config.cookieOptions?.sameSite ?? 'strict',
          maxAge: this.config.cookieOptions?.maxAge ?? 3600000
        });
      }
      
      res.locals.csrfToken = token;
    }
  }

  // Verify CSRF token from request
  private verifyCSRFToken(req: Request): boolean {
    const cookieName = this.config.cookieName!;
    const storedToken = req.cookies?.[cookieName];
    
    if (!storedToken) {
      return false;
    }

    // Get token from various sources
    const token = this.getTokenFromRequest(req);
    if (!token) {
      return false;
    }

    // Verify token
    return verifyCSRFToken(token, this.config.secret, storedToken);
  }

  // Get CSRF token from request
  private getTokenFromRequest(req: Request): string | null {
    // Check header first
    const headerName = this.config.headerName!;
    if (req.headers[headerName.toLowerCase()]) {
      return req.headers[headerName.toLowerCase()] as string;
    }

    // Check body
    const bodyName = this.config.bodyName!;
    if (req.body && req.body[bodyName]) {
      return req.body[bodyName];
    }

    // Check query
    const queryName = this.config.queryName!;
    if (req.query && req.query[queryName]) {
      return req.query[queryName] as string;
    }

    return null;
  }

  // Verify stored token format
  private verifyStoredToken(token: string): boolean {
    // Basic validation - should be hex string
    return /^[a-f0-9]{64}$/.test(token);
  }

  // Handle CSRF error
  private handleCSRFError(res: Response): void {
    res.status(403).json({
      error: 'CSRF token mismatch',
      message: 'Invalid or missing CSRF token',
      code: 'CSRF_TOKEN_MISMATCH'
    });
  }

  // Generate CSRF token for client
  generateToken(): string {
    return generateCSRFToken(this.config.tokenLength!);
  }

  // Verify CSRF token manually
  verifyToken(token: string, storedToken: string): boolean {
    return verifyCSRFToken(token, this.config.secret, storedToken);
  }

  // Update configuration
  updateConfig(newConfig: Partial<CSRFConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current configuration
  getConfig(): CSRFConfig {
    return { ...this.config };
  }
}

// Factory function
export function createCSRFMiddleware(config?: CSRFConfig): CSRFMiddleware {
  return new CSRFMiddleware(config);
}

// CSRF token generation endpoint helper
export function createCSRFTokenEndpoint(csrfMiddleware: CSRFMiddleware) {
  return (req: Request, res: Response) => {
    const token = csrfMiddleware.generateToken();
    const hashedToken = hashToken(token, csrfMiddleware.getConfig().secret);
    
    res.cookie(csrfMiddleware.getConfig().cookieName!, hashedToken, {
      ...csrfMiddleware.getConfig().cookieOptions,
      secure: csrfMiddleware.getConfig().cookieOptions?.secure ?? false,
      httpOnly: csrfMiddleware.getConfig().cookieOptions?.httpOnly ?? true,
      sameSite: csrfMiddleware.getConfig().cookieOptions?.sameSite ?? 'strict',
      maxAge: csrfMiddleware.getConfig().cookieOptions?.maxAge ?? 3600000
    });

    res.json({ csrfToken: token });
  };
}
