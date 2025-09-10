import { Request, Response, NextFunction } from 'express';
import { CacheOptions } from '../types';

// Simple in-memory cache (in production, use Redis or similar)
const cache = new Map<string, { data: any; expiry: number }>();

export class CacheMiddleware {
  static create(options: CacheOptions) {
    return (req: Request, res: Response, next: NextFunction) => {
      const cacheKey = options.keyGenerator 
        ? options.keyGenerator(req)
        : this.generateCacheKey(req, options.key);
      const cached = cache.get(cacheKey);
      
      if (cached && cached.expiry > Date.now()) {
        // Return cached response
        return res.json(cached.data);
      }
      
      // Override res.json to cache response
      const originalJson = res.json;
      res.json = function(data: any) {
        // Cache the response (ttl is already in milliseconds)
        cache.set(cacheKey, {
          data,
          expiry: Date.now() + options.ttl
        });
        
        // Clean up expired entries
        CacheMiddleware.cleanup();
        
        return originalJson.call(this, data);
      };
      
      next();
    };
  }

  private static generateCacheKey(req: Request, customKey?: string): string {
    if (customKey) {
      return customKey;
    }
    
    // Generate key based on method, path, and query
    const queryString = new URLSearchParams(req.query as any).toString();
    return `${req.method}:${req.path}:${queryString}`;
  }

  private static cleanup() {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
      if (value.expiry <= now) {
        cache.delete(key);
      }
    }
  }

  static clear() {
    cache.clear();
  }

  static getStats() {
    return {
      size: cache.size,
      keys: Array.from(cache.keys())
    };
  }
}
