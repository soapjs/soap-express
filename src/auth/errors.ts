import { Request, Response } from 'express';

export interface AuthErrorResponseBody {
  error: string;
  message: string;
  statusCode: number;
}

export interface AuthResponseOptions<TResult = unknown> {
  errorResponse?: (error: Error, req: Request) => unknown;
  successResponse?: (result: TResult, req: Request) => unknown;
}

const AUTH_ERROR_STATUS: Record<string, number> = {
  MissingCredentialsError: 401,
  MissingTokenError: 401,
  MissingApiKeyError: 401,
  InvalidCredentialsError: 401,
  InvalidTokenError: 401,
  InvalidApiKeyError: 401,
  ExpiredTokenError: 401,
  ExpiredApiKeyError: 401,
  UndefinedTokenError: 401,
  UserNotFoundError: 401,
  UnauthorizedRoleError: 403,
  MissingAuthorizationCodeError: 401,
  AccountLockedError: 423,
  RateLimitExceededError: 429,
  InvalidStateError: 400,
  InvalidNonceError: 400,
  InvalidIdTokenError: 401,
  MissingCodeVerifierError: 400,
  InvalidSessionError: 401,
  MissingSessionIdError: 401,
  MissingAuthenticatedUserError: 401,
  MissingRequiredRoleError: 403,
  MissingRequiredPermissionError: 403,
};

export function getAuthErrorName(error: unknown): string {
  if (!error) return 'Error';
  const constructorName = (error as any).constructor?.name;
  if (constructorName && constructorName !== 'Error') return constructorName;
  return (error as any).name || 'Error';
}

export function statusForAuthError(error: unknown): number {
  const explicit = (error as any)?.statusCode;
  if (typeof explicit === 'number') return explicit;

  const name = getAuthErrorName(error);
  if (AUTH_ERROR_STATUS[name]) return AUTH_ERROR_STATUS[name];

  if (/^(Missing|Invalid|Expired|Undefined).*(Token|Credentials|ApiKey|Session)/.test(name)) {
    return 401;
  }
  if (/Role|Permission|Forbidden|UnauthorizedRole/.test(name)) {
    return 403;
  }
  if (/RateLimit/.test(name)) {
    return 429;
  }
  if (/AccountLocked/.test(name)) {
    return 423;
  }

  return 500;
}

export function defaultAuthErrorResponse(error: Error): AuthErrorResponseBody {
  const statusCode = statusForAuthError(error);
  return {
    error: getAuthErrorName(error),
    message: error.message || 'Authentication failed',
    statusCode,
  };
}

export function sendAuthError(
  error: Error,
  req: Request,
  res: Response,
  options: AuthResponseOptions = {},
): void {
  const statusCode = statusForAuthError(error);
  const name = getAuthErrorName(error);
  if (error.name === 'Error' && name !== 'Error') {
    error.name = name;
  }
  const body = options.errorResponse
    ? options.errorResponse(error, req)
    : defaultAuthErrorResponse(error);
  res.status(statusCode).json(body);
}

export class MissingAuthenticatedUserError extends Error {
  constructor() {
    super('User is not authenticated');
    this.name = 'MissingAuthenticatedUserError';
  }
}

export class MissingRequiredRoleError extends Error {
  constructor() {
    super('User does not have a required role');
    this.name = 'MissingRequiredRoleError';
  }
}

export class MissingRequiredPermissionError extends Error {
  constructor() {
    super('User does not have a required permission');
    this.name = 'MissingRequiredPermissionError';
  }
}
