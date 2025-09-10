import { Request, Response } from 'express';

// Security headers configuration
export interface SecurityHeadersConfig {
  enabled: boolean;
  headers: {
    // Content Security Policy
    contentSecurityPolicy?: string | false;
    // X-Frame-Options
    frameOptions?: 'DENY' | 'SAMEORIGIN' | string | false;
    // X-Content-Type-Options
    contentTypeOptions?: boolean;
    // X-XSS-Protection
    xssProtection?: boolean | '1' | '0' | '1; mode=block';
    // Referrer-Policy
    referrerPolicy?: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url' | false;
    // Strict-Transport-Security
    strictTransportSecurity?: string | false;
    // Permissions-Policy
    permissionsPolicy?: string | false;
    // Cross-Origin-Embedder-Policy
    crossOriginEmbedderPolicy?: 'require-corp' | 'credentialless' | false;
    // Cross-Origin-Opener-Policy
    crossOriginOpenerPolicy?: 'same-origin' | 'same-origin-allow-popups' | 'unsafe-none' | false;
    // Cross-Origin-Resource-Policy
    crossOriginResourcePolicy?: 'same-site' | 'same-origin' | 'cross-origin' | false;
  };
  customHeaders?: Record<string, string>;
}

// CSRF protection configuration
export interface CSRFConfig {
  enabled: boolean;
  secret: string;
  cookieName?: string;
  cookieOptions?: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    maxAge?: number;
  };
  tokenLength?: number;
  ignoreMethods?: string[];
  ignorePaths?: string[];
  headerName?: string;
  bodyName?: string;
  queryName?: string;
}

// Input sanitization configuration
export interface InputSanitizationConfig {
  enabled: boolean;
  options: {
    // HTML sanitization
    stripHtml?: boolean;
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
    // SQL injection prevention
    escapeSql?: boolean;
    // XSS prevention
    escapeHtml?: boolean;
    // Path traversal prevention
    preventPathTraversal?: boolean;
    // File upload validation
    validateFileUploads?: boolean;
    maxFileSize?: number;
    allowedMimeTypes?: string[];
    // JSON validation
    validateJson?: boolean;
    maxJsonSize?: number;
  };
  customSanitizers?: Record<string, (value: any) => any>;
}

// Main security configuration
export interface SecurityConfig {
  enabled: boolean;
  headers?: SecurityHeadersConfig;
  csrf?: CSRFConfig;
  sanitization?: InputSanitizationConfig;
  rateLimit?: {
    enabled: boolean;
    windowMs: number;
    max: number;
    skipSuccessfulRequests?: boolean;
  };
  cors?: {
    enabled: boolean;
    origin: string | string[] | boolean;
    credentials?: boolean;
    methods?: string[];
    allowedHeaders?: string[];
  };
}

// Security context
export interface SecurityContext {
  csrfToken?: string;
  isSecure: boolean;
  userAgent?: string;
  ip?: string;
  referer?: string;
  origin?: string;
}

// Security violation types
export interface SecurityViolation {
  type: 'csrf' | 'xss' | 'sql_injection' | 'path_traversal' | 'file_upload' | 'rate_limit';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
}

// Default configurations
export const defaultSecurityHeadersConfig: SecurityHeadersConfig = {
  enabled: true,
  headers: {
    contentSecurityPolicy: "default-src 'self'",
    frameOptions: 'DENY',
    contentTypeOptions: true,
    xssProtection: '1; mode=block',
    referrerPolicy: 'strict-origin-when-cross-origin',
    strictTransportSecurity: 'max-age=31536000; includeSubDomains',
    permissionsPolicy: 'geolocation=(), microphone=(), camera=()',
    crossOriginEmbedderPolicy: 'require-corp',
    crossOriginOpenerPolicy: 'same-origin',
    crossOriginResourcePolicy: 'same-origin'
  }
};

export const defaultCSRFConfig: CSRFConfig = {
  enabled: true,
  secret: 'default-secret-change-in-production',
  cookieName: '_csrf',
  cookieOptions: {
    httpOnly: true,
    secure: false, // Set to true in production with HTTPS
    sameSite: 'strict',
    maxAge: 3600000 // 1 hour
  },
  tokenLength: 32,
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  ignorePaths: ['/health', '/metrics'],
  headerName: 'x-csrf-token',
  bodyName: '_csrf',
  queryName: '_csrf'
};

export const defaultInputSanitizationConfig: InputSanitizationConfig = {
  enabled: true,
  options: {
    stripHtml: true,
    allowedTags: [],
    allowedAttributes: {},
    escapeSql: true,
    escapeHtml: true,
    preventPathTraversal: true,
    validateFileUploads: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    validateJson: true,
    maxJsonSize: 1024 * 1024 // 1MB
  }
};

export const defaultSecurityConfig: SecurityConfig = {
  enabled: true,
  headers: defaultSecurityHeadersConfig,
  csrf: defaultCSRFConfig,
  sanitization: defaultInputSanitizationConfig,
  rateLimit: {
    enabled: true,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    skipSuccessfulRequests: false
  },
  cors: {
    enabled: true,
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
  }
};

// Utility functions
export function generateCSRFToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function hashToken(token: string, secret: string): string {
  const crypto = require('crypto');
  return crypto.createHmac('sha256', secret).update(token).digest('hex');
}

export function verifyCSRFToken(token: string, secret: string, hashedToken: string): boolean {
  return hashToken(token, secret) === hashedToken;
}

export function sanitizeHtml(input: string, allowedTags: string[] = []): string {
  if (!input || typeof input !== 'string') return '';
  
  // Simple HTML tag removal
  let sanitized = input;
  
  if (allowedTags.length === 0) {
    // Remove all HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  } else {
    // Remove all tags except allowed ones
    const allowedTagsStr = allowedTags.join('|');
    const regex = new RegExp(`<(?!/?(?:${allowedTagsStr})\\b)[^>]*>`, 'gi');
    sanitized = sanitized.replace(regex, '');
  }
  
  // Decode HTML entities
  sanitized = sanitized
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
  
  return sanitized;
}

export function escapeHtml(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function escapeSql(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/'/g, "''")
    .replace(/\\/g, '\\\\')
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z');
}

export function preventPathTraversal(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/\.\./g, '')
    .replace(/\/\.\./g, '')
    .replace(/\.\.\//g, '')
    .replace(/\.\.\\/g, '')
    .replace(/\\\.\./g, '');
}

export function validateMimeType(mimeType: string, allowedTypes: string[]): boolean {
  return allowedTypes.includes(mimeType);
}

export function validateFileSize(size: number, maxSize: number): boolean {
  return size <= maxSize;
}
