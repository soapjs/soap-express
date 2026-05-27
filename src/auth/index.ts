// Main auth exports
export * from './registry';
export * from './middleware-factory';

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
