import { Response } from 'express';
import { Result, Failure } from '@soapjs/soap/common';

/**
 * Options for {@link ResultMapper.toResponse}.
 */
export interface ResultMapOptions<T = unknown> {
  /**
   * HTTP status for a successful result.
   * @default 200
   */
  successStatus?: number;

  /**
   * Transform the success content before serialising to JSON.
   * Useful for renaming / wrapping the response body.
   */
  transform?: (content: T) => unknown;
}

// ── Default error-name → HTTP status mapping ───────────────────────────────
// Follows the naming conventions commonly used in @soapjs/soap domain code.
const DEFAULT_MAPPINGS: Record<string, number> = {
  // 400
  BadRequestError: 400,
  ValidationError: 400,
  InvalidInputError: 400,
  // 401
  UnauthorizedError: 401,
  AuthenticationError: 401,
  // 403
  ForbiddenError: 403,
  AccessDeniedError: 403,
  // 404
  NotFoundError: 404,
  EntityNotFoundError: 404,
  ResourceNotFoundError: 404,
  // 409
  ConflictError: 409,
  DuplicateError: 409,
  AlreadyExistsError: 409,
  // 422
  UnprocessableError: 422,
  UnprocessableEntityError: 422,
  // 429
  TooManyRequestsError: 429,
  RateLimitError: 429,
};

/**
 * Maps {@link Result} objects to HTTP responses and tracks a per-application
 * registry of `errorName → statusCode` overrides.
 *
 * **Error resolution order:**
 * 1. {@link HttpFailure} (explicit `statusCode` property) — highest priority
 * 2. Custom mappings added with {@link ResultMapper.register}
 * 3. Built-in defaults (see `DEFAULT_MAPPINGS` above)
 * 4. Fallback: 500
 *
 * @example
 * // Register once (e.g. in app bootstrap):
 * ResultMapper.register('OutOfStockError', 409);
 * ResultMapper.register(/Timeout/, 503);
 *
 * // Use in a controller — no try/catch required:
 * @Get('/products/:id')
 * async getProduct(req: Request, res: Response) {
 *   const result = await this.getProductUseCase.execute({ id: req.params.id });
 *   return ResultMapper.toResponse(result, res);
 * }
 */
export class ResultMapper {
  private static readonly custom = new Map<string | RegExp, number>();

  /**
   * Register a custom `errorName → statusCode` mapping.
   *
   * Called once, typically in the same file where you call `createApp`.
   *
   * @param pattern - Error class name string (exact match) or RegExp tested
   *   against both the error name and the error message.
   * @param statusCode - HTTP status code to send for matching errors.
   *
   * @example
   * ResultMapper.register('OutOfStockError', 409);
   * ResultMapper.register(/database.*timeout/i, 503);
   */
  static register(pattern: string | RegExp, statusCode: number): void {
    this.custom.set(pattern, statusCode);
  }

  /** Remove all custom mappings (useful between tests). */
  static clearCustom(): void {
    this.custom.clear();
  }

  /**
   * Resolve the HTTP status code for a given {@link Failure}.
   *
   * Public so that custom middleware or error handlers can reuse the same
   * lookup logic without calling `toResponse`.
   */
  static statusFor(failure: Failure): number {
    // 1. Error carries an explicit statusCode (e.g. HttpFailure extends Error)
    const statusCode = (failure.error as any).statusCode;
    if (typeof statusCode === 'number') return statusCode;

    const errorName =
      failure.error.name !== 'Error'
        ? failure.error.name
        : failure.error.constructor.name;
    const errorMessage = failure.error.message;

    // 2. Custom mappings
    for (const [pattern, status] of this.custom) {
      if (typeof pattern === 'string' && pattern === errorName) return status;
      if (
        pattern instanceof RegExp &&
        (pattern.test(errorName) || pattern.test(errorMessage))
      )
        return status;
    }

    // 3. Default mappings
    return DEFAULT_MAPPINGS[errorName] ?? 500;
  }

  /**
   * Write an HTTP response derived from a `Result<T>`.
   *
   * - **Success** → `200` (or `options.successStatus`) with the content as
   *   JSON. If the content is `undefined`/`null`, responds with `204 No Content`.
   * - **Failure** → derived status code + JSON `{ error, message }` body.
   *
   * @returns `void` — Express response is ended inside this call.
   *
   * @example
   * const result = await createUserUseCase.execute(dto);
   * return ResultMapper.toResponse(result, res, { successStatus: 201 });
   */
  static toResponse<T>(
    result: Result<T>,
    res: Response,
    options: ResultMapOptions<T> = {}
  ): void {
    // Avoid type-predicate narrowing (isFailure() → else → never);
    // check the property directly so TypeScript keeps result as Result<T>.
    const failure = result.failure;
    if (failure !== undefined) {
      const status = this.statusFor(failure);

      const body: Record<string, unknown> = {
        error: failure.error.name || 'Error',
        message: failure.error.message,
      };

      if (process.env.NODE_ENV !== 'production' && failure.error.stack) {
        body.stack = failure.error.stack;
      }

      res.status(status).json(body);
    } else {
      const content = result.content;
      const successStatus = options.successStatus ?? 200;
      const body = options.transform ? options.transform(content) : content;

      if (body === undefined || body === null) {
        // No content — use 204 unless caller specified an explicit success status
        res.status(options.successStatus ?? 204).end();
      } else {
        res.status(successStatus).json(body);
      }
    }
  }
}
