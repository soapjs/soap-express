import { RouteIO } from '../route-io';
import { DecoratorRegistry } from '../registry';
import { Get } from '../route';
import { Controller } from '../controller';
import { Request, Response } from 'express';
import { ExpressIO } from '../../types';

describe('RouteIO Decorator', () => {
  beforeEach(() => {
    DecoratorRegistry.clear();
  });

  describe('with ExpressIO class', () => {
    it('should register ExpressIO instance', () => {
      class TestIO implements ExpressIO {
        from<T = Request>(source: T) {
          return { data: 'test' };
        }

        to<T = Response>(result: any, target: T) {
          const res = target as Response;
          res.json(result);
        }
      }

      @Controller('/api')
      class TestController {
        @RouteIO(new TestIO())
        @Get('/test')
        testMethod() {}
      }

      const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
      expect(metadata?.routeIO).toBeInstanceOf(TestIO);
    });

    it('should register ExpressIO class', () => {
      class TestIO implements ExpressIO {
        from<T = Request>(source: T) {
          return { data: 'test' };
        }

        to<T = Response>(result: any, target: T) {
          const res = target as Response;
          res.json(result);
        }
      }

      @Controller('/api')
      class TestController {
        @RouteIO(new TestIO())
        @Get('/test')
        testMethod() {}
      }

      const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
      expect(metadata?.routeIO).toBeDefined();
      expect(metadata?.routeIO).toHaveProperty('from');
      expect(metadata?.routeIO).toHaveProperty('to');
    });
  });

  describe('with mapping functions', () => {
    it('should create ExpressIO from mapping functions', () => {
      const fromFn = (req: Request) => ({ body: req.body });
      const toFn = (result: any, res: Response) => res.json({ data: result });

      @Controller('/api')
      class TestController {
        @RouteIO({ from: fromFn, to: toFn })
        @Get('/test')
        testMethod() {}
      }

      const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
      expect(metadata?.routeIO).toBeDefined();
      expect(typeof metadata?.routeIO?.from).toBe('function');
      expect(typeof metadata?.routeIO?.to).toBe('function');
    });

    it('should call inline to mapping with result before response', () => {
      const fromFn = (req: Request) => ({ body: req.body });
      const toFn = jest.fn();

      @Controller('/api')
      class TestController {
        @RouteIO({ from: fromFn, to: toFn })
        @Get('/test')
        testMethod() {}
      }

      const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
      const result = { test: 'result' };
      const mockRes = { json: jest.fn() } as any;

      metadata?.routeIO?.to(result, mockRes);

      expect(toFn).toHaveBeenCalledWith(result, mockRes);
      expect(toFn).not.toHaveBeenCalledWith(mockRes, result);
    });

    it('should handle only from function', () => {
      const fromFn = (req: Request) => ({ body: req.body });

      @Controller('/api')
      class TestController {
        @RouteIO({ from: fromFn })
        @Get('/test')
        testMethod() {}
      }

      const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
      expect(metadata?.routeIO).toBeDefined();
      
      // Test the created IO
      const mockReq = { body: { test: 'data' } } as Request;
      const result = metadata?.routeIO?.from(mockReq);
      expect(result).toEqual({ body: { test: 'data' } });
    });

    it('should handle only to function', () => {
      const toFn = jest.fn((result: any, res: Response) => res.json({ data: result }));

      @Controller('/api')
      class TestController {
        @RouteIO({ to: toFn })
        @Get('/test')
        testMethod() {}
      }

      const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
      expect(metadata?.routeIO).toBeDefined();
      
      // Test the created IO
      const mockRes = { json: jest.fn() } as any;
      const result = { test: 'result' };
      metadata?.routeIO?.to(result, mockRes);

      expect(toFn).toHaveBeenCalledWith(result, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({ data: result });
    });

    it('should default to req.body for from when not provided', () => {
      @Controller('/api')
      class TestController {
        @RouteIO({})
        @Get('/test')
        testMethod() {}
      }

      const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
      expect(metadata?.routeIO).toBeDefined();
      
      // Test the created IO
      const mockReq = { body: { test: 'data' } } as Request;
      const result = metadata?.routeIO?.from(mockReq);
      expect(result).toEqual({ test: 'data' });
    });

    it('should default to res.json for to when not provided', () => {
      @Controller('/api')
      class TestController {
        @RouteIO({})
        @Get('/test')
        testMethod() {}
      }

      const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
      expect(metadata?.routeIO).toBeDefined();
      
      // Test the created IO
      const mockRes = { json: jest.fn() } as any;
      metadata?.routeIO?.to({ test: 'result' }, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({ test: 'result' });
    });
  });

  describe('without route', () => {
    it('should not register routeIO if no route exists', () => {
      class TestIO implements ExpressIO {
        from<T = Request>(source: T) {
          return { data: 'test' };
        }

        to<T = Response>(result: any, target: T) {
          const res = target as Response;
          res.json(result);
        }
      }

      class TestController {
        @RouteIO(new TestIO())
        testMethod() {}
      }

      const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
      expect(metadata).toBeUndefined();
    });
  });

  describe('integration test', () => {
    it('should work with complete flow', () => {
      class TestIO implements ExpressIO {
        from<T = Request>(source: T) {
          const req = source as Request;
          return {
            input: req.body,
            query: req.query
          };
        }

        to<T = Response>(result: any, target: T) {
          const res = target as Response;
          res.status(200).json({
            success: true,
            data: result
          });
        }
      }

      @Controller('/api')
      class TestController {
        @RouteIO(new TestIO())
        @Get('/test')
        testMethod() {}
      }

      const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
      expect(metadata?.routeIO).toBeDefined();

      // Test from
      const mockReq = {
        body: { name: 'test' },
        query: { page: '1' }
      } as any;
      const input = metadata?.routeIO?.from(mockReq);
      expect(input).toEqual({
        input: { name: 'test' },
        query: { page: '1' }
      });

      // Test to
      const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      metadata?.routeIO?.to({ result: 'success' }, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { result: 'success' }
      });
    });
  });
});
