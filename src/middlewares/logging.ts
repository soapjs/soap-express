import { Request, Response, NextFunction } from 'express';
import { LoggingOptions } from '../types';

export class LoggingMiddleware {
  static create(options: LoggingOptions) {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      
      // Log request
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${req.ip}`);
      
      // Override res.end to log response
      const originalEnd = res.end;
      res.end = function(chunk?: any, encoding?: any): any {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
        return originalEnd.call(this, chunk, encoding);
      };
      
      next();
    };
  }

  static createDetailed() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      
      // Log detailed request
      console.log(`[${new Date().toISOString()}] REQUEST:`, {
        method: req.method,
        path: req.path,
        query: req.query,
        body: req.body,
        headers: req.headers,
        ip: req.ip
      });
      
      // Override res.end to log detailed response
      const originalEnd = res.end;
      res.end = function(chunk?: any, encoding?: any): any {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] RESPONSE:`, {
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          responseSize: chunk ? chunk.length : 0
        });
        return originalEnd.call(this, chunk, encoding);
      };
      
      next();
    };
  }
}
