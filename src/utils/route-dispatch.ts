import { Response } from 'express';
import { Result } from '@soapjs/soap/common';
import { ResultMapper } from '../result-mapper';

/**
 * Resolve a use-case (or handler) class from the container, preferring an
 * explicit static `Token` over the class name. Keeps DI consistent with the
 * rest of the framework and survives minification.
 */
export function resolveUseCase<T = unknown>(
  container: { get(token: string): unknown },
  useCaseClass: any,
): T {
  const token: string = useCaseClass?.Token ?? useCaseClass?.name;
  return container.get(token) as T;
}

/**
 * Single, shared response dispatch used by BOTH the decorator routes
 * (RouteBuilder) and the fluent Router (ExpressRouter), so the two definition
 * styles behave identically.
 *
 * Semantics:
 * - a **failed** `Result` → always {@link ResultMapper} (consistent status
 *   mapping, e.g. `ValidationError` → 400), even when a RouteIO is set
 * - a **successful** `Result` (or a raw value) **with** a RouteIO →
 *   `routeIO.to(value, res)` (custom response shaping, e.g. pagination)
 * - a **successful** `Result` **without** a RouteIO → {@link ResultMapper}
 * - a raw value **without** a RouteIO → `res.json(value)`
 * - `undefined` (handler already wrote the response) → no-op
 */
export function dispatchResult(value: unknown, res: Response, routeIO?: any): void {
  // Handler already wrote the response (returned nothing) — nothing to dispatch.
  if (value === undefined) return;

  const isResult = value instanceof Result;

  if (isResult && (value as Result<unknown>).isFailure?.()) {
    ResultMapper.toResponse(value as Result<unknown>, res);
    return;
  }
  if (routeIO) {
    routeIO.to(value, res);
    return;
  }
  if (isResult) {
    ResultMapper.toResponse(value as Result<unknown>, res);
    return;
  }
  if (value !== undefined && !res.headersSent) {
    res.json(value);
  }
}
