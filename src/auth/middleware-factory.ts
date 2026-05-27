import { Request, Response, NextFunction } from 'express';
import { AuthStrategy, AuthUser, RoleConfig, AuthRequest } from '@soapjs/soap/http';
import { AuthRegistry } from './registry';

export class AuthMiddlewareFactory {
  constructor(private registry: AuthRegistry) {}

  // Create authentication middleware
  createAuthMiddleware(strategyName: string, options?: any) {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const strategy = this.registry.get(strategyName);
        if (!strategy) {
          return res.status(500).json({ error: `Auth strategy '${strategyName}' not found` });
        }

        // Use strategy middleware
        const middleware = strategy.middleware(options);
        return middleware(req, res, next);
      } catch (error) {
        return res.status(500).json({ error: 'Authentication failed' });
      }
    };
  }

  // Create authorization middleware
  createRoleMiddleware(roles: RoleConfig) {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          return res.status(401).json({ error: 'User not authenticated' });
        }

        const authorized = await this.checkAuthorization(req.user, roles, req);
        if (!authorized) {
          return res.status(403).json({ error: 'Access denied' });
        }

        next();
      } catch (error) {
        return res.status(500).json({ error: 'Authorization failed' });
      }
    };
  }

  // Create combined auth + role middleware
  createAuthRoleMiddleware(strategyName: string, roles?: RoleConfig, options?: any) {
    const middlewares = [this.createAuthMiddleware(strategyName, options)];
    
    if (roles) {
      middlewares.push(this.createRoleMiddleware(roles));
    }

    return middlewares;
  }

  private async checkAuthorization(user: AuthUser, roles: RoleConfig, req: AuthRequest): Promise<boolean> {
    // Check if user is authenticated
    if (roles.authenticatedOnly && !user) {
      return false;
    }

    // Check denied roles
    if (roles.deny && roles.deny.some(role => user.roles?.includes(role))) {
      return false;
    }

    // Check allowed roles
    if (roles.allow && roles.allow.length > 0) {
      if (!user.roles || !roles.allow.some(role => user.roles!.includes(role))) {
        return false;
      }
    }

    // Check self-only access
    if (roles.selfOnly) {
      if (typeof roles.selfOnly === 'function') {
        const resourceId = req.params.id || req.params.userId;
        return roles.selfOnly(user, resourceId);
      } else {
        const resourceId = req.params.id || req.params.userId;
        return user.id.toString() === resourceId;
      }
    }

    // Custom check
    if (roles.customCheck) {
      return await roles.customCheck(user, req);
    }

    return true;
  }
}
