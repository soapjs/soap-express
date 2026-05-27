import 'reflect-metadata';
import { HttpFailure } from '../http-failure';
import { ResultMapper } from '../result-mapper';
import { Result, Failure } from '@soapjs/soap/common';

// ── Mock Express Response ──────────────────────────────────────────────────

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.end = jest.fn(() => res);
  return res;
}

// ── HttpFailure ────────────────────────────────────────────────────────────

describe('HttpFailure', () => {
  it('is an instance of Error', () => {
    expect(HttpFailure.notFound()).toBeInstanceOf(Error);
  });

  it('sets the statusCode property', () => {
    expect(HttpFailure.notFound('User not found').statusCode).toBe(404);
    expect(HttpFailure.badRequest().statusCode).toBe(400);
    expect(HttpFailure.unauthorized().statusCode).toBe(401);
    expect(HttpFailure.forbidden().statusCode).toBe(403);
    expect(HttpFailure.conflict().statusCode).toBe(409);
    expect(HttpFailure.unprocessable().statusCode).toBe(422);
    expect(HttpFailure.tooManyRequests().statusCode).toBe(429);
    expect(HttpFailure.internal().statusCode).toBe(500);
  });

  it('sets a custom status via withStatus()', () => {
    const f = HttpFailure.withStatus(451, 'Unavailable For Legal Reasons');
    expect(f.statusCode).toBe(451);
    expect(f.message).toBe('Unavailable For Legal Reasons');
  });

  it('uses the provided message', () => {
    expect(HttpFailure.notFound('User 123 not found').message).toBe('User 123 not found');
  });

  it('has sensible default messages', () => {
    expect(HttpFailure.notFound().message).toBe('Not Found');
    expect(HttpFailure.badRequest().message).toBe('Bad Request');
  });

  it('has name "HttpFailure"', () => {
    expect(HttpFailure.notFound().name).toBe('HttpFailure');
  });

  it('works with Result.withFailure(error)', () => {
    const result = Result.withFailure<string>(HttpFailure.notFound('Gone'));
    expect(result.isFailure()).toBe(true);
    expect(result.failure!.error).toBeInstanceOf(HttpFailure);
    expect((result.failure!.error as HttpFailure).statusCode).toBe(404);
  });
});

// ── ResultMapper.statusFor ──────────────────────────────────────────────────

describe('ResultMapper.statusFor', () => {
  afterEach(() => ResultMapper.clearCustom());

  it('returns the statusCode from an HttpFailure error', () => {
    const failure = Failure.fromError(HttpFailure.notFound('gone'));
    expect(ResultMapper.statusFor(failure)).toBe(404);
  });

  it('maps known error names to correct status codes', () => {
    const cases: [string, number][] = [
      ['NotFoundError', 404],
      ['EntityNotFoundError', 404],
      ['ValidationError', 400],
      ['UnauthorizedError', 401],
      ['ForbiddenError', 403],
      ['ConflictError', 409],
      ['DuplicateError', 409],
      ['UnprocessableError', 422],
      ['TooManyRequestsError', 429],
      ['BadRequestError', 400],
    ];

    for (const [name, expected] of cases) {
      const err = new Error('oops');
      err.name = name;
      const failure = Failure.fromError(err);
      expect(ResultMapper.statusFor(failure)).toBe(expected);
    }
  });

  it('falls back to 500 for unknown error names', () => {
    const err = new Error('boom');
    err.name = 'SomeRandomError';
    expect(ResultMapper.statusFor(Failure.fromError(err))).toBe(500);
  });

  it('respects a custom string mapping registered with register()', () => {
    ResultMapper.register('OutOfStockError', 409);
    const err = new Error('item out of stock');
    err.name = 'OutOfStockError';
    expect(ResultMapper.statusFor(Failure.fromError(err))).toBe(409);
  });

  it('respects a custom RegExp mapping registered with register()', () => {
    ResultMapper.register(/timeout/i, 503);
    const err = new Error('database timeout');
    expect(ResultMapper.statusFor(Failure.fromError(err))).toBe(503);
  });

  it('custom mappings take precedence over defaults', () => {
    // ValidationError is 400 by default; override to 422
    ResultMapper.register('ValidationError', 422);
    const err = new Error('bad');
    err.name = 'ValidationError';
    expect(ResultMapper.statusFor(Failure.fromError(err))).toBe(422);
  });

  it('HttpFailure statusCode takes precedence over custom mappings', () => {
    ResultMapper.register('HttpFailure', 418); // register a custom for HttpFailure name
    const failure = Failure.fromError(HttpFailure.conflict('dupe'));
    // explicit statusCode (409) wins over the registered 418
    expect(ResultMapper.statusFor(failure)).toBe(409);
  });
});

// ── ResultMapper.toResponse ────────────────────────────────────────────────

describe('ResultMapper.toResponse', () => {
  afterEach(() => ResultMapper.clearCustom());

  // ── Failure path ─────────────────────────────────────────────────────────

  it('writes the correct status for a failed Result with HttpFailure', () => {
    const res = mockRes();
    const result = Result.withFailure<string>(HttpFailure.notFound('User gone'));
    ResultMapper.toResponse(result, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'HttpFailure', message: 'User gone' })
    );
  });

  it('maps a named error to its default status', () => {
    const res = mockRes();
    const err = new Error('not found');
    err.name = 'NotFoundError';
    const result = Result.withFailure(err);
    ResultMapper.toResponse(result, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('sends 500 for an unknown error', () => {
    const res = mockRes();
    ResultMapper.toResponse(Result.withFailure(new Error('boom')), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('does NOT include stack in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = mockRes();
      ResultMapper.toResponse(Result.withFailure(new Error('prod')), res);
      const body = res.json.mock.calls[0][0];
      expect(body.stack).toBeUndefined();
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('includes stack in non-production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      const res = mockRes();
      const err = new Error('dev');
      // Ensure the error has a stack
      err.stack = 'Error: dev\n    at Test';
      ResultMapper.toResponse(Result.withFailure(err), res);
      const body = res.json.mock.calls[0][0];
      expect(body.stack).toBeDefined();
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  // ── Success path ──────────────────────────────────────────────────────────

  it('writes 200 with the content for a successful Result', () => {
    const res = mockRes();
    const user = { id: '1', name: 'Alice' };
    ResultMapper.toResponse(Result.withSuccess(user), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(user);
  });

  it('uses the successStatus option', () => {
    const res = mockRes();
    ResultMapper.toResponse(Result.withSuccess({ id: '1' }), res, { successStatus: 201 });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('responds 204 (no content) when result content is undefined', () => {
    const res = mockRes();
    ResultMapper.toResponse(Result.withSuccess(), res);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('uses the provided successStatus for 204 override', () => {
    const res = mockRes();
    // successStatus: 201 but content is undefined → use successStatus, not 204
    ResultMapper.toResponse(Result.withSuccess(), res, { successStatus: 201 });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.end).toHaveBeenCalled();
  });

  it('applies a transform function to the success content', () => {
    const res = mockRes();
    const user = { id: '1', name: 'Alice' };
    ResultMapper.toResponse(Result.withSuccess(user), res, {
      transform: u => ({ data: u }),
    });
    expect(res.json).toHaveBeenCalledWith({ data: user });
  });
});
