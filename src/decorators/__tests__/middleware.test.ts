import { Cors, RateLimit, Authentication, Authorization, Validation, Logging, Cache, Middleware } from '../middleware';
import { DecoratorRegistry } from '../registry';
import { Get } from '../route';
import { Controller } from '../controller';

describe('Middleware Decorators', () => {
  beforeEach(() => {
    DecoratorRegistry.clear();
  });

  describe('Cors decorator', () => {
    it('should add CORS middleware to route', () => {
      const options = { origin: 'http://localhost:3000' };

      @Controller('/api')
      class TestController {
        @Cors(options)
        @Get('/test')
        testMethod() {}
      }

      const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
      expect(metadata?.middlewares).toBeDefined();
      expect(metadata?.middlewares).toHaveLength(1);
      expect(metadata?.middlewares[0]).toEqual({
        type: 'cors',
        options,
        order: 0
      });
    });
  });

  describe('RateLimit decorator', () => {
    it('should add rate limit middleware to route', () => {
      const options = { windowMs: 60000, max: 100 };

      @Controller('/api')
      class TestController {
        @RateLimit(options)
        @Get('/test')
        testMethod() {}
      }

      const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
      expect(metadata?.middlewares).toBeDefined();
      expect(metadata?.middlewares).toHaveLength(1);
      expect(metadata?.middlewares[0]).toEqual({
        type: 'rateLimit',
        options,
        order: 0
      });
    });
  });

  describe('Authentication decorator', () => {
    it('should add authentication middleware to route', () => {
      const options = { strategy: 'jwt' };

      @Controller('/api')
      class TestController {
        @Authentication(options)
        @Get('/test')
        testMethod() {}
      }

      const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
      expect(metadata?.middlewares).toBeDefined();
      expect(metadata?.middlewares).toHaveLength(1);
      expect(metadata?.middlewares[0]).toEqual({
        type: 'authentication',
        options,
        order: 0
      });
    });
  });

  describe('Authorization decorator', () => {
    it('should add authorization middleware to route', () => {
      const options = { roles: ['admin'] };

      @Controller('/api')
      class TestController {
        @Authorization(options)
        @Get('/test')
        testMethod() {}
      }

      const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
      expect(metadata?.middlewares).toBeDefined();
      expect(metadata?.middlewares).toHaveLength(1);
      expect(metadata?.middlewares[0]).toEqual({
        type: 'authorization',
        options,
        order: 0
      });
    });
  });

  describe('Validation decorator', () => {
    it('should add validation middleware to route', () => {
      const schema = { type: 'object', properties: { name: { type: 'string' } } };

      @Controller('/api')
      class TestController {
        @Validation(schema)
        @Get('/test')
        testMethod() {}
      }

      const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
      expect(metadata?.middlewares).toBeDefined();
      expect(metadata?.middlewares).toHaveLength(1);
      expect(metadata?.middlewares[0]).toEqual({
        type: 'validation',
        options: { schema },
        order: 0
      });
    });
  });

  describe('Logging decorator', () => {
    it('should add logging middleware to route', () => {
      const options = { level: 'info' };

      @Controller('/api')
      class TestController {
        @Logging(options)
        @Get('/test')
        testMethod() {}
      }

      const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
      expect(metadata?.middlewares).toBeDefined();
      expect(metadata?.middlewares).toHaveLength(1);
      expect(metadata?.middlewares[0]).toEqual({
        type: 'logging',
        options,
        order: 0
      });
    });
  });

  describe('Cache decorator', () => {
    it('should add cache middleware to route', () => {
      const options = { ttl: 300 };

      @Controller('/api')
      class TestController {
        @Cache(options)
        @Get('/test')
        testMethod() {}
      }

      const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
      expect(metadata?.middlewares).toBeDefined();
      expect(metadata?.middlewares).toHaveLength(1);
      expect(metadata?.middlewares[0]).toEqual({
        type: 'cache',
        options,
        order: 0
      });
    });
  });

  describe('Middleware decorator', () => {
    it('should add custom middleware to route', () => {
      const customMiddleware = (req: any, res: any, next: any) => next();

      @Controller('/api')
      class TestController {
        @Middleware(customMiddleware)
        @Get('/test')
        testMethod() {}
      }

      const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
      expect(metadata?.middlewares).toBeDefined();
      expect(metadata?.middlewares).toHaveLength(1);
      expect(metadata?.middlewares[0]).toEqual({
        type: 'custom',
        options: {},
        middleware: customMiddleware,
        order: 0
      });
    });
  });

  describe('Multiple middlewares', () => {
    it('should add multiple middlewares in correct order', () => {
      @Controller('/api')
      class TestController {
        @Cors({ origin: '*' })
        @RateLimit({ windowMs: 60000, max: 100 })
        @Authentication({ strategy: 'jwt' })
        @Get('/test')
        testMethod() {}
      }

      const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
      expect(metadata?.middlewares).toBeDefined();
      expect(metadata?.middlewares).toHaveLength(3);
      expect(metadata?.middlewares[0].type).toBe('authentication');
      expect(metadata?.middlewares[1].type).toBe('rateLimit');
      expect(metadata?.middlewares[2].type).toBe('cors');
    });
  });

  describe('Middleware without route', () => {
    it('should not add middleware if no route exists', () => {
      @Controller('/api')
      class TestController {
        @Cors({ origin: '*' })
        testMethod() {}
      }

      const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
      expect(metadata).toBeUndefined();
    });
  });
});
