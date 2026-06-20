import { Request, Response } from 'express';
import {
  MissingAuthenticatedUserError,
  MissingRequiredPermissionError,
  MissingRequiredRoleError,
  defaultAuthErrorResponse,
  sendAuthError,
  statusForAuthError,
} from '../errors';

describe('auth error mapping', () => {
  it('maps soap-auth auth failures to stable HTTP statuses', () => {
    class MissingTokenError extends Error {}
    class InvalidApiKeyError extends Error {}
    class AccountLockedError extends Error {}
    class RateLimitExceededError extends Error {}

    expect(statusForAuthError(new MissingTokenError())).toBe(401);
    expect(statusForAuthError(new InvalidApiKeyError())).toBe(401);
    expect(statusForAuthError(new AccountLockedError())).toBe(423);
    expect(statusForAuthError(new RateLimitExceededError())).toBe(429);
    expect(statusForAuthError(new MissingRequiredRoleError())).toBe(403);
    expect(statusForAuthError(new MissingRequiredPermissionError())).toBe(403);
    expect(statusForAuthError(new Error('boom'))).toBe(500);
  });

  it('keeps a stable default JSON response shape', () => {
    const body = defaultAuthErrorResponse(new MissingAuthenticatedUserError());

    expect(body).toEqual({
      error: 'MissingAuthenticatedUserError',
      message: 'User is not authenticated',
      statusCode: 401,
    });
  });

  it('allows custom response shaping', () => {
    const req = {} as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    sendAuthError(new MissingAuthenticatedUserError(), req, res, {
      errorResponse: error => ({ code: error.name }),
    });

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ code: 'MissingAuthenticatedUserError' });
  });
});
