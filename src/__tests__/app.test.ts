import { SoapExpressApp } from '../app';
import { SoapExpressOptions } from '../types';
import { DIContainer } from '@soapjs/soap';

// Mock dependencies
const mockApp = {
  use: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn()
};

jest.mock('express', () => {
  const mockJson = jest.fn(() => 'json-middleware');
  const mockUrlencoded = jest.fn(() => 'urlencoded-middleware');
  
  const express = () => mockApp;
  express.json = mockJson;
  express.urlencoded = mockUrlencoded;
  
  return {
    __esModule: true,
    default: express,
    json: mockJson,
    urlencoded: mockUrlencoded
  };
});

jest.mock('http', () => ({
  createServer: jest.fn(() => ({
    listen: jest.fn()
  }))
}));

jest.mock('../decorators/registry', () => ({
  DecoratorRegistry: {
    getControllers: jest.fn(() => {
      const map = new Map();
      map.set('TestController', { name: 'TestController' });
      map.set('Controller1', { name: 'Controller1' });
      map.set('Controller2', { name: 'Controller2' });
      return map;
    }),
    getRoutes: jest.fn(() => new Map())
  }
}));
jest.mock('../utils/route-builder', () => ({
  RouteBuilder: jest.fn().mockImplementation(() => ({
    registerController: jest.fn(),
    registerRouter: jest.fn(),
    registerRoute: jest.fn(),
    registerRouteGroup: jest.fn()
  }))
}));
jest.mock('../error-handling/error-handler');
jest.mock('../auth');

import { DecoratorRegistry } from '../decorators/registry';
import { RouteBuilder } from '../utils/route-builder';
import { ErrorHandler } from '../error-handling/error-handler';
import { AuthRegistry, AuthMiddlewareFactory } from '../auth';

describe('SoapExpressApp', () => {
  let app: SoapExpressApp;
  let mockOptions: SoapExpressOptions;
  let mockContainer: DIContainer;

  beforeEach(() => {
    mockContainer = {
      bindValue: jest.fn(),
      bindClass: jest.fn(),
      bindFactory: jest.fn(),
      get: jest.fn(),
      has: jest.fn(),
      clear: jest.fn()
    } as any;

    mockOptions = {
      container: mockContainer
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      app = new SoapExpressApp({});

      expect(app).toBeDefined();
      expect(app.getApp()).toBeDefined();
    });

    it('should initialize with custom container', () => {
      app = new SoapExpressApp(mockOptions);

      expect(app).toBeDefined();
      expect(app.getContainer()).toBe(mockContainer);
    });

    it('should register auth middleware factory in container', () => {
      app = new SoapExpressApp(mockOptions);

      expect(mockContainer.bindValue).toHaveBeenCalledWith('AuthMiddlewareFactory', expect.any(AuthMiddlewareFactory));
    });
  });

  describe('registerController', () => {
    beforeEach(() => {
      app = new SoapExpressApp(mockOptions);
    });

    it('should register single controller', () => {
      const mockController = { name: 'TestController' };
      const registerControllerSpy = jest.spyOn(app['routeBuilder'], 'registerController');

      app.registerController(mockController);

      expect(registerControllerSpy).toHaveBeenCalledWith(mockController);
    });

    it('should register multiple controllers', () => {
      const mockControllers = [
        { name: 'Controller1' },
        { name: 'Controller2' }
      ];
      const registerControllerSpy = jest.spyOn(app['routeBuilder'], 'registerController');

      app.registerController(mockControllers);

      expect(registerControllerSpy).toHaveBeenCalledTimes(2);
      expect(registerControllerSpy).toHaveBeenCalledWith(mockControllers[0]);
      expect(registerControllerSpy).toHaveBeenCalledWith(mockControllers[1]);
    });

    it('should throw error if controller not found in registry', () => {
      const mockController = { name: 'TestController' };
      const registerControllerSpy = jest.spyOn(app['routeBuilder'], 'registerController')
        .mockImplementation(() => {
          throw new Error('Controller TestController not found in registry');
        });

      expect(() => app.registerController(mockController)).toThrow('Controller TestController not found in registry');
      registerControllerSpy.mockRestore();
    });
  });

  describe('registerControllers', () => {
    beforeEach(() => {
      app = new SoapExpressApp(mockOptions);
    });

    it('should be an alias for registerController', () => {
      const mockControllers = [{ name: 'Controller1' }];
      const registerControllerSpy = jest.spyOn(app, 'registerController');

      app.registerControllers(mockControllers);

      expect(registerControllerSpy).toHaveBeenCalledWith(mockControllers);
    });
  });

  describe('registerRouter', () => {
    beforeEach(() => {
      app = new SoapExpressApp(mockOptions);
    });

    it('should register router', () => {
      const mockRouter = { getRoutes: jest.fn() };
      const registerRouterSpy = jest.spyOn(app['routeBuilder'], 'registerRouter');

      app.registerRouter(mockRouter);

      expect(registerRouterSpy).toHaveBeenCalledWith(mockRouter);
    });
  });

  describe('registerRoute', () => {
    beforeEach(() => {
      app = new SoapExpressApp(mockOptions);
    });

    it('should register route', () => {
      const mockRoute = { method: 'GET', path: '/test' };
      const registerRouteSpy = jest.spyOn(app['routeBuilder'], 'registerRoute');
      const routeRegistrySpy = jest.spyOn(app['routeRegistry'], 'register');

      app.registerRoute(mockRoute as any);

      expect(routeRegistrySpy).toHaveBeenCalledWith(mockRoute);
      expect(registerRouteSpy).toHaveBeenCalledWith(mockRoute);
    });
  });

  describe('registerRouteGroup', () => {
    beforeEach(() => {
      app = new SoapExpressApp(mockOptions);
    });

    it('should register route group', () => {
      const mockGroup = { routes: [] };
      const registerRouteGroupSpy = jest.spyOn(app['routeBuilder'], 'registerRouteGroup');
      const routeRegistrySpy = jest.spyOn(app['routeRegistry'], 'register');

      app.registerRouteGroup(mockGroup as any);

      expect(routeRegistrySpy).toHaveBeenCalledWith(mockGroup);
      expect(registerRouteGroupSpy).toHaveBeenCalledWith(mockGroup);
    });
  });

  describe('registerMiddleware', () => {
    beforeEach(() => {
      app = new SoapExpressApp(mockOptions);
    });

    it('should register middleware', () => {
      const mockMiddleware = jest.fn();
      const mockMiddlewareRegistry = {
        add: jest.fn()
      };

      // Mock the middleware registry
      (app as any).middlewareRegistry = mockMiddlewareRegistry;

      app.registerMiddleware(mockMiddleware);

      expect(mockMiddlewareRegistry.add).toHaveBeenCalledWith(mockMiddleware, true);
    });

    it('should register middleware with ready flag', () => {
      const mockMiddleware = jest.fn();
      const mockMiddlewareRegistry = {
        add: jest.fn()
      };

      // Mock the middleware registry
      (app as any).middlewareRegistry = mockMiddlewareRegistry;

      app.registerMiddleware(mockMiddleware, false);

      expect(mockMiddlewareRegistry.add).toHaveBeenCalledWith(mockMiddleware, false);
    });
  });

  describe('auth methods', () => {
    beforeEach(() => {
      app = new SoapExpressApp(mockOptions);
    });

    it('should register auth strategy', () => {
      const mockStrategy = { name: 'jwt' };
      const mockAuthRegistry = {
        register: jest.fn()
      };

      // Mock the auth registry
      (app as any).authRegistry = mockAuthRegistry;

      const result = app.registerAuthStrategy(mockStrategy as any);

      expect(mockAuthRegistry.register).toHaveBeenCalledWith(mockStrategy);
      expect(result).toBe(app);
    });

    it('should get auth registry', () => {
      const mockAuthRegistry = { name: 'test' };
      (app as any).authRegistry = mockAuthRegistry;

      const result = app.getAuthRegistry();

      expect(result).toBe(mockAuthRegistry);
    });

    it('should get auth middleware factory', () => {
      const mockAuthMiddlewareFactory = { name: 'test' };
      (app as any).authMiddlewareFactory = mockAuthMiddlewareFactory;

      const result = app.getAuthMiddlewareFactory();

      expect(result).toBe(mockAuthMiddlewareFactory);
    });
  });

  describe('Dependency Injection helpers', () => {
    beforeEach(() => {
      app = new SoapExpressApp(mockOptions);
    });

    it('should register service', () => {
      const mockService = class TestService {};
      const result = app.registerService('TestService', mockService);
      expect(result).toBe(app);
    });

    it('should register value', () => {
      const testValue = 'test-value';
      const result = app.registerValue('test-key', testValue);
      expect(result).toBe(app);
    });

    it('should register factory', () => {
      const testFactory = () => 'test-factory';
      const result = app.registerFactory('test-factory', testFactory);
      expect(result).toBe(app);
    });

    it('should get service', () => {
      const result = app.getService('TestService');
      expect(result).toBeDefined();
    });

    it('should check if service exists', () => {
      const result = app.hasService('TestService');
      expect(result).toBe(true);
    });
  });

  describe('start', () => {
    beforeEach(() => {
      app = new SoapExpressApp(mockOptions);
    });

    it('should start server on default port', async () => {
      const mockServer = {
        listen: jest.fn((port, callback) => {
          callback(null);
        })
      };
      const mockCreateServer = require('http').createServer;
      mockCreateServer.mockReturnValue(mockServer);

      await app.start();

      expect(mockCreateServer).toHaveBeenCalled();
      expect(mockServer.listen).toHaveBeenCalledWith(3000, expect.any(Function));
    });

    it('should start server on custom port', async () => {
      const mockServer = {
        listen: jest.fn((port, callback) => {
          callback(null);
        })
      };
      const mockCreateServer = require('http').createServer;
      mockCreateServer.mockReturnValue(mockServer);

      await app.start(8080);

      expect(mockServer.listen).toHaveBeenCalledWith(8080, expect.any(Function));
    });

    it('should reject on server error', async () => {
      const mockServer = {
        listen: jest.fn((port, callback) => {
          callback(new Error('Server error'));
        })
      };
      const mockCreateServer = require('http').createServer;
      mockCreateServer.mockReturnValue(mockServer);

      await expect(app.start()).rejects.toThrow('Server error');
    });
  });

  describe('healthCheck', () => {
    beforeEach(() => {
      app = new SoapExpressApp(mockOptions);
    });

    it('should add health check route', () => {
      const mockApp = app.getApp();
      app.healthCheck();

      expect(mockApp.get).toHaveBeenCalledWith('/health', expect.any(Function));
    });
  });

  describe('getters', () => {
    beforeEach(() => {
      app = new SoapExpressApp(mockOptions);
    });

    it('should get Express app', () => {
      const expressApp = app.getApp();
      expect(expressApp).toBeDefined();
    });

    it('should get HTTP server', () => {
      const server = app.getServer();
      expect(server).toBeUndefined(); // Not started yet
    });

    it('should get route registry', () => {
      const routeRegistry = app.getRouteRegistry();
      expect(routeRegistry).toBeDefined();
    });

    it('should get middleware registry', () => {
      const middlewareRegistry = app.getMiddlewareRegistry();
      expect(middlewareRegistry).toBeDefined();
    });

    it('should get container', () => {
      const container = app.getContainer();
      expect(container).toBe(mockContainer);
    });
  });
});
