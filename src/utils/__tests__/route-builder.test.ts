import { RouteBuilder } from '../route-builder';
import { DecoratorRegistry } from '../../decorators/registry';
import { MiddlewareFactory } from '../middleware-factory';
import { RouteMetadata, ControllerMetadata, MiddlewareMetadata } from '../../types';
import { DIContainer } from '@soapjs/soap';

// Mock dependencies
jest.mock('../../decorators/registry');
jest.mock('../middleware-factory');
jest.mock('@soapjs/soap', () => ({
  get: jest.fn()
}));

import { get } from '@soapjs/soap';

describe('RouteBuilder', () => {
  let routeBuilder: RouteBuilder;
  let mockApp: any;
  let mockContainer: DIContainer;
  let mockMiddlewareFactory: jest.Mocked<MiddlewareFactory>;

  beforeEach(() => {
    mockApp = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
      use: jest.fn()
    };

    mockContainer = {
      get: jest.fn(),
      bindValue: jest.fn(),
      bindClass: jest.fn(),
      bindFactory: jest.fn(),
      has: jest.fn(),
      clear: jest.fn()
    } as any;

    mockMiddlewareFactory = {
      create: jest.fn()
    } as any;

    (MiddlewareFactory as jest.Mock).mockImplementation(() => mockMiddlewareFactory);

    routeBuilder = new RouteBuilder(mockApp, mockContainer);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with app and container', () => {
      expect(routeBuilder).toBeDefined();
      expect(MiddlewareFactory).toHaveBeenCalled();
    });
  });

  describe('registerController', () => {
    it('should throw error if controller not found in registry', () => {
      const mockController = { name: 'TestController' };
      (DecoratorRegistry.getControllers as jest.Mock).mockReturnValue(new Map());

      expect(() => routeBuilder.registerController(mockController)).toThrow(
        'Controller TestController not found in registry'
      );
    });

    it('should register controller with middlewares and routes', () => {
      const mockController = { name: 'TestController' };
      const controllerMetadata: ControllerMetadata = {
        basePath: '/api',
        middlewares: [
          {
            type: 'cors',
            options: { origin: '*' },
            order: 0
          }
        ],
        type: 'http'
      };

      const routeMetadata: RouteMetadata = {
        method: 'GET',
        path: '/test',
        middlewares: [],
        handler: jest.fn()
      };

      const routesMap = new Map();
      routesMap.set('TestController.testMethod', routeMetadata);

      (DecoratorRegistry.getControllers as jest.Mock).mockReturnValue(
        new Map([['TestController', controllerMetadata]])
      );
      (DecoratorRegistry.getRoutes as jest.Mock).mockReturnValue(routesMap);

      const mockMiddleware = jest.fn();
      mockMiddlewareFactory.create.mockReturnValue(mockMiddleware);

      routeBuilder.registerController(mockController);

      expect(mockApp.use).toHaveBeenCalledWith(mockMiddleware);
      expect(mockApp.get).toHaveBeenCalledWith('/api/test', expect.any(Function));
    });

    it('should register controller without middlewares', () => {
      const mockController = { name: 'TestController' };
      const controllerMetadata: ControllerMetadata = {
        basePath: '/api',
        middlewares: [],
        type: 'http'
      };

      const routeMetadata: RouteMetadata = {
        method: 'POST',
        path: '/test',
        middlewares: [],
        handler: jest.fn()
      };

      const routesMap = new Map();
      routesMap.set('TestController.testMethod', routeMetadata);

      (DecoratorRegistry.getControllers as jest.Mock).mockReturnValue(
        new Map([['TestController', controllerMetadata]])
      );
      (DecoratorRegistry.getRoutes as jest.Mock).mockReturnValue(routesMap);

      routeBuilder.registerController(mockController);

      expect(mockApp.use).not.toHaveBeenCalled();
      expect(mockApp.post).toHaveBeenCalledWith('/api/test', expect.any(Function));
    });
  });

  describe('registerRouter', () => {
    it('should register routes from router', () => {
      const mockRouter = {
        getRoutes: jest.fn().mockReturnValue([
          {
            method: 'GET',
            path: '/test',
            middlewares: [],
            handler: jest.fn()
          }
        ])
      };

      const mockMiddleware = jest.fn();
      mockMiddlewareFactory.create.mockReturnValue(mockMiddleware);

      routeBuilder.registerRouter(mockRouter);

      expect(mockApp.get).toHaveBeenCalledWith('/test', expect.any(Function));
    });

    it('should handle array method', () => {
      const mockRouter = {
        getRoutes: jest.fn().mockReturnValue([
          {
            method: ['GET', 'POST'],
            path: '/test',
            middlewares: [],
            handler: jest.fn()
          }
        ])
      };

      const mockMiddleware = jest.fn();
      mockMiddlewareFactory.create.mockReturnValue(mockMiddleware);

      routeBuilder.registerRouter(mockRouter);

      expect(mockApp.get).toHaveBeenCalledWith('/test', expect.any(Function));
    });

    it('should handle useCase execution', () => {
      const mockUseCase = { execute: jest.fn().mockResolvedValue({ result: 'success' }) };
      (get as jest.Mock).mockReturnValue(mockUseCase);

      const mockRouter = {
        getRoutes: jest.fn().mockReturnValue([
          {
            method: 'GET',
            path: '/test',
            middlewares: [],
            useCase: 'TestUseCase',
            routeIO: {
              from: jest.fn().mockReturnValue({ input: 'test' }),
              to: jest.fn()
            }
          }
        ])
      };

      const mockMiddleware = jest.fn();
      mockMiddlewareFactory.create.mockReturnValue(mockMiddleware);

      routeBuilder.registerRouter(mockRouter);

      expect(mockApp.get).toHaveBeenCalledWith('/test', expect.any(Function));
    });
  });

  describe('registerRoute', () => {
    it('should register single route', () => {
      const mockRoute = {
        method: 'GET',
        path: '/test',
        handler: jest.fn(),
        options: {}
      };

      routeBuilder.registerRoute(mockRoute as any);

      expect(mockApp.get).toHaveBeenCalledWith('/test', expect.any(Function));
    });

    it('should register multiple paths', () => {
      const mockRoute = {
        method: 'GET',
        path: ['/test1', '/test2'],
        handler: jest.fn(),
        options: {}
      };

      routeBuilder.registerRoute(mockRoute as any);

      expect(mockApp.get).toHaveBeenCalledWith('/test1', expect.any(Function));
      expect(mockApp.get).toHaveBeenCalledWith('/test2', expect.any(Function));
    });

    it('should register multiple methods', () => {
      const mockRoute = {
        method: ['GET', 'POST'],
        path: '/test',
        handler: jest.fn(),
        options: {}
      };

      routeBuilder.registerRoute(mockRoute as any);

      expect(mockApp.get).toHaveBeenCalledWith('/test', expect.any(Function));
      expect(mockApp.post).toHaveBeenCalledWith('/test', expect.any(Function));
    });

    it('should handle route with IO', () => {
      const mockRoute = {
        method: 'POST',
        path: '/test',
        handler: jest.fn().mockResolvedValue({ result: 'success' }),
        io: {
          from: jest.fn().mockReturnValue({ input: 'test' }),
          to: jest.fn()
        },
        options: {}
      };

      routeBuilder.registerRoute(mockRoute as any);

      expect(mockApp.post).toHaveBeenCalledWith('/test', expect.any(Function));
    });
  });

  describe('registerRouteGroup', () => {
    it('should register all routes in group', () => {
      const mockRoute1 = {
        method: 'GET',
        path: '/test1',
        handler: jest.fn(),
        options: {}
      };

      const mockRoute2 = {
        method: 'POST',
        path: '/test2',
        handler: jest.fn(),
        options: {}
      };

      const mockGroup = {
        routes: [mockRoute1, mockRoute2]
      };

      routeBuilder.registerRouteGroup(mockGroup as any);

      expect(mockApp.get).toHaveBeenCalledWith('/test1', expect.any(Function));
      expect(mockApp.post).toHaveBeenCalledWith('/test2', expect.any(Function));
    });
  });

  describe('buildMiddlewares', () => {
    it('should sort middlewares by order', () => {
      const middlewares: MiddlewareMetadata[] = [
        { type: 'cors', options: {}, order: 2 },
        { type: 'rateLimit', options: {}, order: 0 },
        { type: 'validation', options: { schema: {} }, order: 1 }
      ];

      const mockMiddleware1 = jest.fn();
      const mockMiddleware2 = jest.fn();
      const mockMiddleware3 = jest.fn();

      mockMiddlewareFactory.create
        .mockReturnValueOnce(mockMiddleware1) // rateLimit (order 0)
        .mockReturnValueOnce(mockMiddleware2) // validation (order 1)
        .mockReturnValueOnce(mockMiddleware3); // cors (order 2)

      const result = (routeBuilder as any).buildMiddlewares(middlewares);

      expect(result).toEqual([mockMiddleware1, mockMiddleware2, mockMiddleware3]);
    });
  });

  describe('getPropertyKey', () => {
    it('should return property key for route', () => {
      const mockController = { name: 'TestController' };
      const routeMetadata: RouteMetadata = {
        method: 'GET',
        path: '/test',
        middlewares: [],
        handler: jest.fn()
      };

      const routesMap = new Map();
      routesMap.set('TestController.testMethod', routeMetadata);

      (DecoratorRegistry.getRoutes as jest.Mock).mockReturnValue(routesMap);

      const result = (routeBuilder as any).getPropertyKey('TestController', routeMetadata);

      expect(result).toBe('testMethod');
    });

    it('should return empty string if route not found', () => {
      const routesMap = new Map();
      (DecoratorRegistry.getRoutes as jest.Mock).mockReturnValue(routesMap);

      const result = (routeBuilder as any).getPropertyKey('TestController', {} as RouteMetadata);

      expect(result).toBe('');
    });
  });

  describe('buildAuthMiddlewares', () => {
    it('should return empty array if no auth metadata', () => {
      const mockController = { name: 'TestController' };
      const routeMetadata: RouteMetadata = {
        method: 'GET',
        path: '/test',
        middlewares: [],
        handler: jest.fn()
      };

      const result = (routeBuilder as any).buildAuthMiddlewares(mockController, routeMetadata);

      expect(result).toEqual([]);
    });

    it('should return empty array if auth not required', () => {
      const mockController = {
        name: 'TestController',
        __authMetadata: new Map([['testMethod', { required: false }]])
      };
      const routeMetadata: RouteMetadata = {
        method: 'GET',
        path: '/test',
        middlewares: [],
        handler: jest.fn()
      };

      const routesMap = new Map();
      routesMap.set('TestController.testMethod', routeMetadata);
      (DecoratorRegistry.getRoutes as jest.Mock).mockReturnValue(routesMap);

      const result = (routeBuilder as any).buildAuthMiddlewares(mockController, routeMetadata);

      expect(result).toEqual([]);
    });

    it('should create auth middlewares when required', () => {
      const mockAuthMiddleware = jest.fn();
      const mockRoleMiddleware = jest.fn();
      const mockAuthFactory = {
        createAuthMiddleware: jest.fn().mockReturnValue(mockAuthMiddleware),
        createRoleMiddleware: jest.fn().mockReturnValue(mockRoleMiddleware)
      };

      (mockContainer.get as jest.Mock).mockReturnValue(mockAuthFactory);

      const mockController = {
        name: 'TestController',
        __authMetadata: new Map([['testMethod', {
          required: true,
          strategy: 'jwt',
          roles: { allow: ['admin'] }
        }]])
      };
      const routeMetadata: RouteMetadata = {
        method: 'GET',
        path: '/test',
        middlewares: [],
        handler: jest.fn()
      };

      const routesMap = new Map();
      routesMap.set('TestController.testMethod', routeMetadata);
      (DecoratorRegistry.getRoutes as jest.Mock).mockReturnValue(routesMap);

      const result = (routeBuilder as any).buildAuthMiddlewares(mockController, routeMetadata);

      expect(result).toEqual([mockAuthMiddleware, mockRoleMiddleware]);
      expect(mockAuthFactory.createAuthMiddleware).toHaveBeenCalledWith('jwt');
      expect(mockAuthFactory.createRoleMiddleware).toHaveBeenCalledWith({ allow: ['admin'] });
    });
  });

  describe('error handling', () => {
    it('should handle errors in route execution', async () => {
      const mockRoute = {
        method: 'GET',
        path: '/test',
        handler: jest.fn().mockRejectedValue(new Error('Test error')),
        options: {}
      };

      const mockReq = {};
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      routeBuilder.registerRoute(mockRoute as any);

      const routeHandler = mockApp.get.mock.calls[0][1];
      await routeHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Test error' });
    });

    it('should use custom error handler if provided', async () => {
      const mockErrorHandler = {
        handler: jest.fn()
      };

      const mockRoute = {
        method: 'GET',
        path: '/test',
        handler: jest.fn().mockRejectedValue(new Error('Test error')),
        errorHandler: mockErrorHandler,
        options: {}
      };

      const mockReq = {};
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      routeBuilder.registerRoute(mockRoute as any);

      const routeHandler = mockApp.get.mock.calls[0][1];
      await routeHandler(mockReq, mockRes);

      expect(mockErrorHandler.handler).toHaveBeenCalledWith(expect.any(Error), mockReq, mockRes);
    });
  });
});
