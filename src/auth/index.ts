// Main auth exports
export * from './registry';
export * from './middleware-factory';
export * from './context';
export * from './errors';
export * from './middleware';
export * from './cookies';
export * from './recipes';
export * from './router';
export * from './oauth2-storage';

// Re-export auth types from @soapjs/soap
export type { 
  AuthUser, 
  AuthRequest, 
  AuthConfig, 
  RoleConfig, 
  AuthStrategy,
  SessionConfig 
} from '@soapjs/soap/http';
export { AuthType } from '@soapjs/soap/http';
