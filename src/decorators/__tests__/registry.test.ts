import { DecoratorRegistry } from '../registry';
import { RouteMetadata, ControllerMetadata } from '../../types';

describe('DecoratorRegistry', () => {
  beforeEach(() => {
    DecoratorRegistry.clear();
  });

  describe('Route registration', () => {
    it('should register a route', () => {
      const target = class TestController {};
      const propertyKey = 'testMethod';
      const metadata: RouteMetadata = {
        method: 'GET',
        path: '/test',
        middlewares: []
      };

      DecoratorRegistry.registerRoute(target, propertyKey, metadata);

      const result = DecoratorRegistry.getRoute(target, propertyKey);
      expect(result).toEqual(metadata);
    });

    it('should return undefined for non-existent route', () => {
      const target = class TestController {};
      const propertyKey = 'nonExistent';

      const result = DecoratorRegistry.getRoute(target, propertyKey);
      expect(result).toBeUndefined();
    });

    it('should get all routes', () => {
      const target1 = class TestController1 {};
      const target2 = class TestController2 {};
      const metadata1: RouteMetadata = {
        method: 'GET',
        path: '/test1',
        middlewares: []
      };
      const metadata2: RouteMetadata = {
        method: 'POST',
        path: '/test2',
        middlewares: []
      };

      DecoratorRegistry.registerRoute(target1, 'method1', metadata1);
      DecoratorRegistry.registerRoute(target2, 'method2', metadata2);

      const routes = DecoratorRegistry.getRoutes();
      expect(routes.size).toBe(2);
      expect(routes.get('TestController1.method1')).toEqual(metadata1);
      expect(routes.get('TestController2.method2')).toEqual(metadata2);
    });
  });

  describe('Controller registration', () => {
    it('should register a controller', () => {
      const target = class TestController {};
      const metadata: ControllerMetadata = {
        basePath: '/api',
        middlewares: [],
        type: 'http'
      };

      DecoratorRegistry.registerController(target, metadata);

      const result = DecoratorRegistry.getController(target);
      expect(result).toEqual(metadata);
    });

    it('should return undefined for non-existent controller', () => {
      const target = class TestController {};

      const result = DecoratorRegistry.getController(target);
      expect(result).toBeUndefined();
    });

    it('should get all controllers', () => {
      const target1 = class TestController1 {};
      const target2 = class TestController2 {};
      const metadata1: ControllerMetadata = {
        basePath: '/api1',
        middlewares: [],
        type: 'http'
      };
      const metadata2: ControllerMetadata = {
        basePath: '/api2',
        middlewares: [],
        type: 'http'
      };

      DecoratorRegistry.registerController(target1, metadata1);
      DecoratorRegistry.registerController(target2, metadata2);

      const controllers = DecoratorRegistry.getControllers();
      expect(controllers.size).toBe(2);
      expect(controllers.get('TestController1')).toEqual(metadata1);
      expect(controllers.get('TestController2')).toEqual(metadata2);
    });
  });

  describe('Clear registry', () => {
    it('should clear all routes and controllers', () => {
      const target = class TestController {};
      const routeMetadata: RouteMetadata = {
        method: 'GET',
        path: '/test',
        middlewares: []
      };
      const controllerMetadata: ControllerMetadata = {
        basePath: '/api',
        middlewares: [],
        type: 'http'
      };

      DecoratorRegistry.registerRoute(target, 'method', routeMetadata);
      DecoratorRegistry.registerController(target, controllerMetadata);

      expect(DecoratorRegistry.getRoutes().size).toBe(1);
      expect(DecoratorRegistry.getControllers().size).toBe(1);

      DecoratorRegistry.clear();

      expect(DecoratorRegistry.getRoutes().size).toBe(0);
      expect(DecoratorRegistry.getControllers().size).toBe(0);
    });
  });
});
