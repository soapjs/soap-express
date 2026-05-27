/**
 * An `Error` subclass that carries an explicit HTTP status code.
 *
 * Pass it to `Result.withFailure()` — no wrapper needed.
 * `ResultMapper.toResponse` detects the `statusCode` property automatically.
 *
 * @example
 * // In a use case:
 * if (!user) return Result.withFailure(HttpFailure.notFound('User not found'));
 *
 * // In a controller (with auto-mapping in route-builder):
 * async getUser(req, res) {
 *   return this.getUserUseCase.execute({ id: req.params.id });
 *   // Failure with HttpFailure.notFound → 404 JSON response, no try/catch
 * }
 */
export class HttpFailure extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'HttpFailure';
    this.statusCode = statusCode;
    // Required for correct instanceof checks when targeting ES5 or down-level emit.
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** Any status code you need. */
  static withStatus(statusCode: number, message: string): HttpFailure {
    return new HttpFailure(message, statusCode);
  }

  // ── Convenience factories ────────────────────────────────────────────────

  /** 400 Bad Request */
  static badRequest(message = 'Bad Request'): HttpFailure {
    return new HttpFailure(message, 400);
  }

  /** 401 Unauthorized */
  static unauthorized(message = 'Unauthorized'): HttpFailure {
    return new HttpFailure(message, 401);
  }

  /** 403 Forbidden */
  static forbidden(message = 'Forbidden'): HttpFailure {
    return new HttpFailure(message, 403);
  }

  /** 404 Not Found */
  static notFound(message = 'Not Found'): HttpFailure {
    return new HttpFailure(message, 404);
  }

  /** 409 Conflict */
  static conflict(message = 'Conflict'): HttpFailure {
    return new HttpFailure(message, 409);
  }

  /** 422 Unprocessable Entity */
  static unprocessable(message = 'Unprocessable Entity'): HttpFailure {
    return new HttpFailure(message, 422);
  }

  /** 429 Too Many Requests */
  static tooManyRequests(message = 'Too Many Requests'): HttpFailure {
    return new HttpFailure(message, 429);
  }

  /** 500 Internal Server Error */
  static internal(message = 'Internal Server Error'): HttpFailure {
    return new HttpFailure(message, 500);
  }
}
