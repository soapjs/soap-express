import { Request, Response, NextFunction } from 'express';
import { AuthOptions } from '../types';

export class AuthenticationMiddleware {
  static create(options: AuthOptions) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!options.required) {
          return next();
        }

        const token = this.extractToken(req);
        if (!token) {
          return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = this.verifyToken(token, options.secret);
        if (!decoded) {
          return res.status(401).json({ error: 'Invalid token' });
        }

        // Check roles if specified
        if (options.roles && options.roles.length > 0) {
          if (!decoded.roles || !this.hasRequiredRole(decoded.roles, options.roles)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
          }
        }

        // Add user to request
        (req as any).user = decoded;
        next();
      } catch (error) {
        res.status(401).json({ error: 'Authentication failed' });
      }
    };
  }

  private static extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }

  private static verifyToken(token: string, secret?: string): any {
    // This is a simplified implementation
    // In real app, use JWT library
    try {
      // Mock verification - replace with actual JWT verification
      if (token === 'valid-token') {
        return { id: 'user-id', roles: ['user'] };
      }
      return null;
    } catch {
      return null;
    }
  }

  private static hasRequiredRole(userRoles: string[], requiredRoles: string[]): boolean {
    return requiredRoles.some(role => userRoles.includes(role));
  }
}

export class AuthorizationMiddleware {
  static create(options: { resource: string; action: string }) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = (req as any).user;
        if (!user) {
          return res.status(401).json({ error: 'User not authenticated' });
        }

        // Check if user has permission for resource and action
        const hasPermission = this.checkPermission(user, options.resource, options.action);
        if (!hasPermission) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }

        next();
      } catch (error) {
        res.status(500).json({ error: 'Authorization failed' });
      }
    };
  }

  private static checkPermission(user: any, resource: string, action: string): boolean {
    // Simplified permission check
    // In real app, implement proper RBAC/ABAC
    return user.roles && user.roles.includes('admin');
  }
}
