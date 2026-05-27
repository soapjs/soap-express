import { ValidationMiddleware, ValidatorFn, joiAdapter, zodAdapter } from '../validation';
import { Request, Response, NextFunction } from 'express';

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockRes(): Partial<Response> {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

const mockNext: NextFunction = jest.fn();

function resetNext() {
  (mockNext as jest.Mock).mockClear();
}

// ── ValidatorFn factories (no Joi/Zod dependency) ─────────────────────────────

const passValidator: ValidatorFn = (data) => ({ valid: true, value: data });

const failValidator: ValidatorFn = () => ({
  valid: false,
  errors: [{ field: 'email', message: 'Email is required' }],
});

const throwingValidator: ValidatorFn = () => {
  throw new Error('validator exploded');
};

const asyncPassValidator: ValidatorFn = async (data) => ({ valid: true, value: data });

// ── ValidationMiddleware.create ───────────────────────────────────────────────

describe('ValidationMiddleware.create (body)', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    resetNext();
    req = { body: { name: 'Alice', email: 'alice@example.com' } };
    res = mockRes();
  });

  it('returns a middleware function', () => {
    expect(typeof ValidationMiddleware.create(passValidator)).toBe('function');
  });

  it('calls next() and replaces body with coerced value on success', async () => {
    const coerced = { name: 'Alice', email: 'alice@example.com', _coerced: true };
    const validator: ValidatorFn = () => ({ valid: true, value: coerced });

    await ValidationMiddleware.create(validator)(req as Request, res as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(req.body).toBe(coerced);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('keeps original body when validator returns no value', async () => {
    const original = { name: 'Alice' };
    req.body = original;
    const validator: ValidatorFn = () => ({ valid: true }); // no value

    await ValidationMiddleware.create(validator)(req as Request, res as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(req.body).toBe(original);
  });

  it('responds 400 with errors when validation fails', async () => {
    await ValidationMiddleware.create(failValidator)(req as Request, res as Response, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation failed',
      details: [{ field: 'email', message: 'Email is required' }],
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('responds 400 with empty details array when no errors provided', async () => {
    const noErrorsValidator: ValidatorFn = () => ({ valid: false });
    await ValidationMiddleware.create(noErrorsValidator)(req as Request, res as Response, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Validation failed', details: [] });
  });

  it('responds 500 when the validator throws', async () => {
    await ValidationMiddleware.create(throwingValidator)(req as Request, res as Response, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Validation error' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('works with an async validator', async () => {
    await ValidationMiddleware.create(asyncPassValidator)(req as Request, res as Response, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });
});

// ── ValidationMiddleware.createQuery ──────────────────────────────────────────

describe('ValidationMiddleware.createQuery', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    resetNext();
    req = { query: { page: '1', limit: '10' } as any };
    res = mockRes();
  });

  it('validates req.query and replaces it with coerced value', async () => {
    const coerced = { page: 1, limit: 10 };
    const validator: ValidatorFn = () => ({ valid: true, value: coerced });

    await ValidationMiddleware.createQuery(validator)(req as Request, res as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(req.query).toBe(coerced);
  });

  it('responds 400 on query validation failure', async () => {
    await ValidationMiddleware.createQuery(failValidator)(req as Request, res as Response, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Query validation failed' })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('responds 500 when the validator throws', async () => {
    await ValidationMiddleware.createQuery(throwingValidator)(req as Request, res as Response, mockNext);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Query validation error' });
  });
});

// ── ValidationMiddleware.createParams ─────────────────────────────────────────

describe('ValidationMiddleware.createParams', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    resetNext();
    req = { params: { id: '123' } as any };
    res = mockRes();
  });

  it('validates req.params and replaces it with coerced value', async () => {
    const coerced = { id: 123 };
    const validator: ValidatorFn = () => ({ valid: true, value: coerced });

    await ValidationMiddleware.createParams(validator)(req as Request, res as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(req.params).toBe(coerced);
  });

  it('responds 400 on params validation failure', async () => {
    await ValidationMiddleware.createParams(failValidator)(req as Request, res as Response, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Parameter validation failed' })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('responds 500 when the validator throws', async () => {
    await ValidationMiddleware.createParams(throwingValidator)(req as Request, res as Response, mockNext);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Parameter validation error' });
  });
});

// ── joiAdapter ────────────────────────────────────────────────────────────────

describe('joiAdapter', () => {
  it('returns valid: true and coerced value when schema passes', () => {
    const schema = {
      validate: jest.fn().mockReturnValue({ error: null, value: { name: 'Alice' } }),
    };

    const result = joiAdapter(schema)({ name: 'Alice' });

    expect(result).toEqual({ valid: true, value: { name: 'Alice' } });
    expect(schema.validate).toHaveBeenCalledWith({ name: 'Alice' }, { abortEarly: false });
  });

  it('returns valid: false with mapped errors when schema fails', () => {
    const schema = {
      validate: jest.fn().mockReturnValue({
        error: {
          details: [
            { path: ['email'], message: 'Email is required' },
            { path: ['user', 'profile', 'age'], message: 'Must be a number' },
          ],
        },
        value: null,
      }),
    };

    const result = joiAdapter(schema)({}) as any;

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      { field: 'email', message: 'Email is required' },
      { field: 'user.profile.age', message: 'Must be a number' },
    ]);
  });

  it('handles missing details array gracefully', () => {
    const schema = {
      validate: jest.fn().mockReturnValue({ error: {}, value: null }),
    };
    const result = joiAdapter(schema)({}) as any;
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([]);
  });
});

// ── zodAdapter ────────────────────────────────────────────────────────────────

describe('zodAdapter', () => {
  it('returns valid: true and parsed data on success', () => {
    const schema = {
      safeParse: jest.fn().mockReturnValue({ success: true, data: { name: 'Alice' } }),
    };

    const result = zodAdapter(schema)({ name: 'Alice' });

    expect(result).toEqual({ valid: true, value: { name: 'Alice' } });
  });

  it('returns valid: false with mapped errors on failure', () => {
    const schema = {
      safeParse: jest.fn().mockReturnValue({
        success: false,
        error: {
          errors: [
            { path: ['email'], message: 'Invalid email' },
            { path: ['age'], message: 'Expected number' },
          ],
        },
      }),
    };

    const result = zodAdapter(schema)({}) as any;

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      { field: 'email', message: 'Invalid email' },
      { field: 'age', message: 'Expected number' },
    ]);
  });

  it('handles missing error object gracefully', () => {
    const schema = {
      safeParse: jest.fn().mockReturnValue({ success: false }),
    };
    const result = zodAdapter(schema)({}) as any;
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([]);
  });
});
