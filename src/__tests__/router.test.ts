import { SoapRouter } from '../router';
import { RouteMetadata, MiddlewareMetadata } from '../types';

describe('SoapRouter', () => {
  let router: SoapRouter;

  beforeEach(() => {
    router = new SoapRouter();
  });

  describe('constructor', () => {
    it('should initialize with empty base path', () => {
      const newRouter = new SoapRouter();
      expect(newRouter.getBasePath()).toBe('');
    });

    it('should initialize with custom base path', () => {
      const newRouter = new SoapRouter('/api/v1');
      expect(newRouter.getBasePath()).toBe('/api/v1');
    });
  });

  describe('route methods', () => {
    it('should add GET route', () => {
      const handler = jest.fn();
      const result = router.get('/test', handler);

      expect(result).toBe(router);
      const routes = router.getRoutes();
      expect(routes).toHaveLength(1);
      expect(routes[0]).toEqual({
        method: 'GET',
        path: '/test',
        handler,
        middlewares: []
      });
    });

    it('should add POST route', () => {
      const handler = jest.fn();
      const result = router.post('/test', handler);

      expect(result).toBe(router);
      const routes = router.getRoutes();
      expect(routes[0].method).toBe('POST');
    });

    it('should add PUT route', () => {
      const handler = jest.fn();
      const result = router.put('/test', handler);

      expect(result).toBe(router);
      const routes = router.getRoutes();
      expect(routes[0].method).toBe('PUT');
    });

    it('should add DELETE route', () => {
      const handler = jest.fn();
      const result = router.delete('/test', handler);

      expect(result).toBe(router);
      const routes = router.getRoutes();
      expect(routes[0].method).toBe('DELETE');
    });

    it('should add PATCH route', () => {
      const handler = jest.fn();
      const result = router.patch('/test', handler);

      expect(result).toBe(router);
      const routes = router.getRoutes();
      expect(routes[0].method).toBe('PATCH');
    });

    it('should combine base path with route path', () => {
      const routerWithBase = new SoapRouter('/api');
      const handler = jest.fn();
      
      routerWithBase.get('/test', handler);
      
      const routes = routerWithBase.getRoutes();
      expect(routes[0].path).toBe('/api/test');
    });
  });

  describe('middleware methods', () => {
    it('should add custom middleware', () => {
      const middleware = jest.fn();
      const result = router.use(middleware);

      expect(result).toBe(router);
      const middlewares = (router as any).middlewares;
      expect(middlewares).toHaveLength(1);
      expect(middlewares[0]).toEqual({
        type: 'custom',
        options: {},
        middleware,
        order: 0
      });
    });

    it('should add CORS middleware', () => {
      const options = { origin: '*' };
      const result = router.cors(options);

      expect(result).toBe(router);
      const middlewares = (router as any).middlewares;
      expect(middlewares[0]).toEqual({
        type: 'cors',
        options,
        order: 0
      });
    });

    it('should add rate limit middleware', () => {
      const options = { windowMs: 60000, max: 100 };
      const result = router.rateLimit(options);

      expect(result).toBe(router);
      const middlewares = (router as any).middlewares;
      expect(middlewares[0]).toEqual({
        type: 'rateLimit',
        options,
        order: 0
      });
    });

    it('should add auth middleware', () => {
      const options = { strategy: 'jwt' };
      const result = router.auth(options);

      expect(result).toBe(router);
      const middlewares = (router as any).middlewares;
      expect(middlewares[0]).toEqual({
        type: 'authentication',
        options,
        order: 0
      });
    });

    it('should add authorization middleware', () => {
      const options = { roles: ['admin'] };
      const result = router.authorize(options);

      expect(result).toBe(router);
      const middlewares = (router as any).middlewares;
      expect(middlewares[0]).toEqual({
        type: 'authorization',
        options,
        order: 0
      });
    });

    it('should add validation middleware', () => {
      const schema = { type: 'object' };
      const result = router.validate(schema);

      expect(result).toBe(router);
      const middlewares = (router as any).middlewares;
      expect(middlewares[0]).toEqual({
        type: 'validation',
        options: { schema },
        order: 0
      });
    });

    it('should add logging middleware', () => {
      const options = { level: 'info' };
      const result = router.logging(options);

      expect(result).toBe(router);
      const middlewares = (router as any).middlewares;
      expect(middlewares[0]).toEqual({
        type: 'logging',
        options,
        order: 0
      });
    });

    it('should add cache middleware', () => {
      const options = { ttl: 300 };
      const result = router.cache(options);

      expect(result).toBe(router);
      const middlewares = (router as any).middlewares;
      expect(middlewares[0]).toEqual({
        type: 'cache',
        options,
        order: 0
      });
    });

    it('should maintain middleware order', () => {
      const middleware1 = jest.fn();
      const middleware2 = jest.fn();

      router.use(middleware1);
      router.cors({ origin: '*' });
      router.use(middleware2);

      const middlewares = (router as any).middlewares;
      expect(middlewares[0].order).toBe(0);
      expect(middlewares[1].order).toBe(1);
      expect(middlewares[2].order).toBe(2);
    });
  });

  describe('useCase integration', () => {
    it('should set useCase for current route', () => {
      const useCaseClass = class TestUseCase {};
      const result = router.useCase(useCaseClass);

      expect(result).toBe(router);
      expect((router as any).currentRoute).toBeNull(); // No route added yet
    });

    it('should set useCase for route after adding route', () => {
      const handler = jest.fn();
      const useCaseClass = class TestUseCase {};

      router.get('/test', handler);
      router.useCase(useCaseClass);

      const routes = router.getRoutes();
      expect(routes[0].useCase).toBe(useCaseClass);
    });
  });

  describe('routeIO integration', () => {
    it('should set routeIO for current route', () => {
      const routeIO = { from: jest.fn(), to: jest.fn() };
      const result = router.routeIO(routeIO);

      expect(result).toBe(router);
      expect((router as any).currentRoute).toBeNull(); // No route added yet
    });

    it('should set routeIO for route after adding route', () => {
      const handler = jest.fn();
      const routeIO = { from: jest.fn(), to: jest.fn() };

      router.get('/test', handler);
      router.routeIO(routeIO);

      const routes = router.getRoutes();
      expect(routes[0].routeIO).toBe(routeIO);
    });
  });

  describe('errorHandler integration', () => {
    it('should set router-level error handler', () => {
      const errorHandler = { handler: jest.fn() };
      const result = router.setErrorHandler(errorHandler);

      expect(result).toBe(router);
      expect(router.getErrorHandler()).toBe(errorHandler);
    });

    it('should get router-level error handler', () => {
      const errorHandler = { handler: jest.fn() };
      router.setErrorHandler(errorHandler);

      expect(router.getErrorHandler()).toBe(errorHandler);
    });

    it('should return undefined when no error handler is set', () => {
      expect(router.getErrorHandler()).toBeUndefined();
    });
  });

  describe('getRoutes', () => {
    it('should return all routes', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      router.get('/test1', handler1);
      router.post('/test2', handler2);

      const routes = router.getRoutes();
      expect(routes).toHaveLength(2);
      expect(routes[0].method).toBe('GET');
      expect(routes[1].method).toBe('POST');
    });

    it('should return empty array when no routes', () => {
      const routes = router.getRoutes();
      expect(routes).toEqual([]);
    });
  });

  describe('getBasePath', () => {
    it('should return base path', () => {
      const routerWithBase = new SoapRouter('/api/v1');
      expect(routerWithBase.getBasePath()).toBe('/api/v1');
    });

    it('should return empty string for default router', () => {
      expect(router.getBasePath()).toBe('');
    });
  });

  describe('clear', () => {
    it('should clear all routes and middlewares', () => {
      const handler = jest.fn();
      const middleware = jest.fn();

      router.get('/test', handler);
      router.use(middleware);
      router.cors({ origin: '*' });

      expect(router.getRoutes()).toHaveLength(1);
      expect((router as any).middlewares).toHaveLength(2);

      router.clear();

      expect(router.getRoutes()).toHaveLength(0);
      expect((router as any).middlewares).toHaveLength(0);
      expect((router as any).currentRoute).toBeNull();
    });
  });

  describe('route with middlewares', () => {
    it('should include middlewares in route', () => {
      const handler = jest.fn();
      const middleware1 = jest.fn();
      const middleware2 = jest.fn();

      router.use(middleware1);
      router.cors({ origin: '*' });
      router.get('/test', handler);
      router.use(middleware2);

      const routes = router.getRoutes();
      expect(routes[0].middlewares).toHaveLength(2);
      expect(routes[0].middlewares[0].type).toBe('custom');
      expect(routes[0].middlewares[1].type).toBe('cors');
    });

    it('should not include middlewares added after route', () => {
      const handler = jest.fn();
      const middleware = jest.fn();

      router.get('/test', handler);
      router.use(middleware);

      const routes = router.getRoutes();
      expect(routes[0].middlewares).toHaveLength(0);
    });
  });

  describe('chaining', () => {
    it('should support method chaining', () => {
      const handler = jest.fn();
      const middleware = jest.fn();

      const result = router
        .use(middleware)
        .cors({ origin: '*' })
        .get('/test', handler)
        .post('/test2', handler);

      expect(result).toBe(router);
      expect(router.getRoutes()).toHaveLength(2);
      expect((router as any).middlewares).toHaveLength(2);
    });
  });
});
