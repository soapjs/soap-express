import { Request, Response, NextFunction } from 'express';
import { AuthStrategy, AuthUser, RoleConfig, AuthRequest, HttpContext } from '@soapjs/soap/http';
import { AuthRegistry } from './registry';

function toHttpContext(req: Request, res: Response, next: NextFunction): HttpContext {
  return { req: req as unknown as HttpContext['req'], res: res as unknown as HttpContext['res'], next };
}

export interface AuthMiddlewareOptions {
  required?: boolean;
}

export class AuthMiddlewareFactory {
  constructor(private registry: AuthRegistry) {}

  createAuthMiddleware(strategyName: string, options: AuthMiddlewareOptions = {}) {
    const required = options.required !== false;
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
      const strategy = this.registry.get(strategyName);
      if (!strategy) {
        return res.status(500).json({ error: `Auth strategy '${strategyName}' not found` });
      }
      try {
        const ctx = toHttpContext(req as unknown as Request, res, next);
        const result = await strategy.authenticate(ctx);
        if (result) {
          req.user = result.user;
          next();
        } else if (!required) {
          next();
        } else {
          res.status(401).json({ error: 'Unauthorized' });
        }
      } catch (error) {
        res.status(500).json({ error: 'Authentication failed' });
      }
    };
  }

  createLogoutMiddleware(strategyName: string) {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
      const strategy = this.registry.get(strategyName);
      if (!strategy) {
        return res.status(500).json({ error: `Auth strategy '${strategyName}' not found` });
      }
      try {
        const ctx = toHttpContext(req as unknown as Request, res, next);
        if (strategy.logout) {
          await strategy.logout(ctx);
        }
        next();
      } catch (error) {
        res.status(500).json({ error: 'Logout failed' });
      }
    };
  }

  createRefreshMiddleware(strategyName: string) {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
      const strategy = this.registry.get(strategyName);
      if (!strategy) {
        return res.status(500).json({ error: `Auth strategy '${strategyName}' not found` });
      }
      try {
        const ctx = toHttpContext(req as unknown as Request, res, next);
        if (strategy.refresh) {
          const result = await strategy.refresh(ctx);
          req.user = result.user;
          next();
        } else {
          res.status(405).json({ error: `Strategy '${strategyName}' does not support token refresh` });
        }
      } catch (error) {
        res.status(500).json({ error: 'Token refresh failed' });
      }
    };
  }

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
        res.status(500).json({ error: 'Authorization failed' });
      }
    };
  }

  createAuthRoleMiddleware(strategyName: string, roles?: RoleConfig, options?: AuthMiddlewareOptions) {
    const middlewares = [this.createAuthMiddleware(strategyName, options)];
    if (roles) {
      middlewares.push(this.createRoleMiddleware(roles));
    }
    return middlewares;
  }

  private async checkAuthorization(user: AuthUser, roles: RoleConfig, req: AuthRequest): Promise<boolean> {
    if (roles.authenticatedOnly && !user) return false;
    if (roles.deny && roles.deny.some(role => user.roles?.includes(role))) return false;
    if (roles.allow && roles.allow.length > 0) {
      if (!user.roles || !roles.allow.some(role => user.roles!.includes(role))) return false;
    }
    if (roles.selfOnly) {
      if (typeof roles.selfOnly === 'function') {
        const resourceId = req.params?.id || req.params?.userId;
        return roles.selfOnly(user, resourceId);
      } else {
        const resourceId = req.params?.id || req.params?.userId;
        return user.id.toString() === resourceId;
      }
    }
    if (roles.customCheck) {
      return await roles.customCheck(user, req);
    }
    return true;
  }
}
