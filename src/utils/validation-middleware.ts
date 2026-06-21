import type { RouteAdditionalOptions } from '@soapjs/soap/http';

/**
 * Legacy Joi-style `validation.request.schema.validate()` only.
 * Zod and other adapters should attach middleware via `options.middlewares.pre`
 * (see `@soapjs/soap-zod` `bodyContract`).
 */
export function buildLegacyValidationMiddlewares(options?: RouteAdditionalOptions): any[] {
  if (!options) return [];
  const validation = (options as RouteAdditionalOptions & { validation?: any }).validation;
  if (validation?.request?.schema && typeof validation.request.schema.validate === 'function') {
    return [(req: any, res: any, next: any) => {
      const { error } = validation.request!.schema.validate(req.body, { abortEarly: false });
      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          message: error.details?.map((d: any) => d.message) ?? [error.message],
        });
      }
      next();
    }];
  }
  return [];
}
