import { Request, Response, NextFunction } from 'express';
import { ValidationOptions } from '../types';

export class ValidationMiddleware {
  static create(schema: any) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Validate request body
        const { error, value } = schema.validate(req.body);
        if (error) {
          return res.status(400).json({
            error: 'Validation failed',
            details: error.details.map((detail: any) => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          });
        }

        // Replace request body with validated data
        req.body = value;
        next();
      } catch (error) {
        res.status(500).json({ error: 'Validation error' });
      }
    };
  }

  static createQuery(schema: any) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Validate query parameters
        const { error, value } = schema.validate(req.query);
        if (error) {
          return res.status(400).json({
            error: 'Query validation failed',
            details: error.details.map((detail: any) => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          });
        }

        // Replace query with validated data
        req.query = value;
        next();
      } catch (error) {
        res.status(500).json({ error: 'Query validation error' });
      }
    };
  }

  static createParams(schema: any) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Validate route parameters
        const { error, value } = schema.validate(req.params);
        if (error) {
          return res.status(400).json({
            error: 'Parameter validation failed',
            details: error.details.map((detail: any) => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          });
        }

        // Replace params with validated data
        req.params = value;
        next();
      } catch (error) {
        res.status(500).json({ error: 'Parameter validation error' });
      }
    };
  }
}
