import { Request, Response, NextFunction } from 'express';

// ── Validator contract ────────────────────────────────────────────────────────

/** A single field-level validation error. */
export interface ValidatorError {
  /** Dot-separated field path, e.g. `"user.email"` or `"items.0.name"`. */
  field: string;
  message: string;
}

/**
 * The return type of a {@link ValidatorFn}.
 *
 * - `valid: false` → `errors` describes what failed.
 * - `valid: true`  → `value` is the coerced/transformed data (replaces the
 *   original `req.body` / `req.query` / `req.params`).
 */
export interface ValidatorResult {
  valid: boolean;
  value?: unknown;
  errors?: ValidatorError[];
}

/**
 * A library-agnostic validation function.
 *
 * Wrap any schema library with one of the provided adapters
 * ({@link joiAdapter}, {@link zodAdapter}) or write your own.
 *
 * @example
 * // Custom validator
 * const checkAge: ValidatorFn = (data: any) =>
 *   data.age >= 18
 *     ? { valid: true, value: data }
 *     : { valid: false, errors: [{ field: 'age', message: 'Must be 18+' }] };
 */
export type ValidatorFn = (data: unknown) => ValidatorResult | Promise<ValidatorResult>;

// ── Adapters ──────────────────────────────────────────────────────────────────

/**
 * Wraps a **Joi** schema into a {@link ValidatorFn}.
 *
 * @example
 * import Joi from 'joi';
 * import { ValidationMiddleware, joiAdapter } from '@soapjs/soap-express';
 *
 * const schema = Joi.object({ email: Joi.string().email().required() });
 * app.use(ValidationMiddleware.create(joiAdapter(schema)));
 */
export function joiAdapter(schema: any): ValidatorFn {
  return (data: unknown): ValidatorResult => {
    const { error, value } = schema.validate(data, { abortEarly: false });
    if (error) {
      return {
        valid: false,
        errors: (error.details ?? []).map((d: any) => ({
          field: Array.isArray(d.path) ? d.path.join('.') : String(d.path ?? ''),
          message: d.message,
        })),
      };
    }
    return { valid: true, value };
  };
}

/**
 * Wraps a **Zod** schema into a {@link ValidatorFn}.
 *
 * @example
 * import { z } from 'zod';
 * import { ValidationMiddleware, zodAdapter } from '@soapjs/soap-express';
 *
 * const schema = z.object({ email: z.string().email() });
 * app.use(ValidationMiddleware.create(zodAdapter(schema)));
 */
export function zodAdapter(schema: any): ValidatorFn {
  return (data: unknown): ValidatorResult => {
    const result = schema.safeParse(data);
    if (!result.success) {
      return {
        valid: false,
        errors: (result.error?.errors ?? []).map((e: any) => ({
          field: Array.isArray(e.path) ? e.path.join('.') : String(e.path ?? ''),
          message: e.message,
        })),
      };
    }
    return { valid: true, value: result.data };
  };
}

// ── Middleware ─────────────────────────────────────────────────────────────────

/**
 * Express middleware that validates parts of the request using a
 * library-agnostic {@link ValidatorFn}.
 *
 * Use the provided adapters ({@link joiAdapter}, {@link zodAdapter}) or
 * supply your own function that returns a {@link ValidatorResult}.
 *
 * @example
 * // Joi
 * app.use(ValidationMiddleware.create(joiAdapter(myJoiSchema)));
 *
 * // Zod
 * router.post('/users', ValidationMiddleware.create(zodAdapter(myZodSchema)));
 *
 * // Custom
 * router.get('/items', ValidationMiddleware.createQuery(myCustomFn));
 */
export class ValidationMiddleware {
  /**
   * Validate `req.body`.
   * On success the body is replaced with the validator's coerced `value`.
   */
  static create(validator: ValidatorFn) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await validator(req.body);
        if (!result.valid) {
          return res.status(400).json({
            error: 'Validation failed',
            details: result.errors ?? [],
          });
        }
        if (result.value !== undefined) req.body = result.value;
        next();
      } catch {
        res.status(500).json({ error: 'Validation error' });
      }
    };
  }

  /**
   * Validate `req.query`.
   * On success the query object is replaced with the validator's coerced `value`.
   */
  static createQuery(validator: ValidatorFn) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await validator(req.query);
        if (!result.valid) {
          return res.status(400).json({
            error: 'Query validation failed',
            details: result.errors ?? [],
          });
        }
        if (result.value !== undefined) req.query = result.value as any;
        next();
      } catch {
        res.status(500).json({ error: 'Query validation error' });
      }
    };
  }

  /**
   * Validate `req.params`.
   * On success the params object is replaced with the validator's coerced `value`.
   */
  static createParams(validator: ValidatorFn) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await validator(req.params);
        if (!result.valid) {
          return res.status(400).json({
            error: 'Parameter validation failed',
            details: result.errors ?? [],
          });
        }
        if (result.value !== undefined) req.params = result.value as any;
        next();
      } catch {
        res.status(500).json({ error: 'Parameter validation error' });
      }
    };
  }
}
