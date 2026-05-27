import { RoleConfig } from '@soapjs/soap/http';

export interface AuthDecoratorOptions {
  strategy?: string;
  roles?: RoleConfig;
  required?: boolean;
}

/**
 * Decorator to specify authentication and authorization for a controller method
 * 
 * @param options - Authentication configuration (string for strategy name or object with options)
 * 
 * @example
 * ```typescript
 * @Controller('/users')
 * class UserController {
 *   @Get('/profile')
 *   @Auth('jwt') // Simple strategy name
 *   async getProfile() { ... }
 * 
 *   @Post('/admin')
 *   @Auth({ 
 *     strategy: 'jwt', 
 *     roles: { allow: ['admin'] } 
 *   })
 *   async adminAction() { ... }
 * 
 *   @Get('/public')
 *   @Auth({ required: false })
 *   async publicEndpoint() { ... }
 * }
 * ```
 */
export function Auth(options: string | AuthDecoratorOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // Store auth metadata on the method
    if (!target.constructor.__authMetadata) {
      target.constructor.__authMetadata = new Map();
    }
    
    // Handle string input (strategy name)
    const authConfig = typeof options === 'string' 
      ? { strategy: options, required: true }
      : { ...options, required: options.required ?? true };
    
    target.constructor.__authMetadata.set(propertyKey, authConfig);
    
    return descriptor;
  };
}

/**
 * Decorator to specify that a method requires admin role
 * Shorthand for @Auth({ roles: { allow: ['admin'] } })
 */
export function AdminOnly(strategy?: string) {
  return Auth({ 
    strategy, 
    roles: { allow: ['admin'] },
    required: true 
  });
}

/**
 * Decorator to specify that a method requires specific roles
 * Shorthand for @Auth({ roles: { allow: roles } })
 */
export function RolesOnly(roles: string[], strategy?: string) {
  return Auth({ 
    strategy, 
    roles: { allow: roles },
    required: true 
  });
}

/**
 * Decorator to specify that a method is public (no auth required)
 * Shorthand for @Auth({ required: false })
 */
export function Public() {
  return Auth({ required: false });
}

/**
 * Decorator to specify that a method allows only the resource owner
 * Shorthand for @Auth({ roles: { selfOnly: true } })
 */
export function SelfOnly(strategy?: string) {
  return Auth({ 
    strategy, 
    roles: { selfOnly: true },
    required: true 
  });
}
