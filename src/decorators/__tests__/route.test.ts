import { Get, Post, Put, Delete, Patch, Head, Options, Trace, Connect, All } from '../route';
import { Controller } from '../controller';
import { DecoratorRegistry } from '../registry';

describe('Route Decorators', () => {
  beforeEach(() => {
    DecoratorRegistry.clear();
  });

  describe('Get decorator', () => {
    it('should register GET route', () => {
      @Controller('/api')
      @Controller('/api')
      class TestController {
        @Get('/test')
        testMethod() {}
      }

      const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
      expect(metadata).toEqual({
        method: 'GET',
        path: '/test',
        middlewares: [],
        options: undefined
      });
    });

    it('should register GET route with options', () => {
      const options = { cors: { origin: '*' } };
      
      @Controller('/api')
      @Controller('/api')
      class TestController {
        @Get('/test', options)
        testMethod() {}
      }

      const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
      expect(metadata).toEqual({
        method: 'GET',
        path: '/test',
        middlewares: [],
        options
      });
    });
  });

  describe('Post decorator', () => {
    it('should register POST route', () => {
      @Controller('/api')
      @Controller('/api')
      class TestController {
        @Post('/test')
        testMethod() {}
      }

      const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
      expect(metadata).toEqual({
        method: 'POST',
        path: '/test',
        middlewares: [],
        options: undefined
      });
    });
  });

  describe('Put decorator', () => {
    it('should register PUT route', () => {
      @Controller('/api')
      class TestController {
        @Put('/test')
        testMethod() {}
      }

      const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
      expect(metadata).toEqual({
        method: 'PUT',
        path: '/test',
        middlewares: [],
        options: undefined
      });
    });
  });

  describe('Delete decorator', () => {
    it('should register DELETE route', () => {
      @Controller('/api')
      class TestController {
        @Delete('/test')
        testMethod() {}
      }

      const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
      expect(metadata).toEqual({
        method: 'DELETE',
        path: '/test',
        middlewares: [],
        options: undefined
      });
    });
  });

  describe('Patch decorator', () => {
    it('should register PATCH route', () => {
      @Controller('/api')
      class TestController {
        @Patch('/test')
        testMethod() {}
      }

      const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
      expect(metadata).toEqual({
        method: 'PATCH',
        path: '/test',
        middlewares: [],
        options: undefined
      });
    });
  });

  describe('Head decorator', () => {
    it('should register HEAD route', () => {
      @Controller('/api')
      class TestController {
        @Head('/test')
        testMethod() {}
      }

      const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
      expect(metadata).toEqual({
        method: 'HEAD',
        path: '/test',
        middlewares: [],
        options: undefined
      });
    });
  });

  describe('Options decorator', () => {
    it('should register OPTIONS route', () => {
      @Controller('/api')
      class TestController {
        @Options('/test')
        testMethod() {}
      }

      const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
      expect(metadata).toEqual({
        method: 'OPTIONS',
        path: '/test',
        middlewares: [],
        options: undefined
      });
    });
  });

  describe('Trace decorator', () => {
    it('should register TRACE route', () => {
      @Controller('/api')
      class TestController {
        @Trace('/test')
        testMethod() {}
      }

      const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
      expect(metadata).toEqual({
        method: 'TRACE',
        path: '/test',
        middlewares: [],
        options: undefined
      });
    });
  });

  describe('Connect decorator', () => {
    it('should register CONNECT route', () => {
      @Controller('/api')
      class TestController {
        @Connect('/test')
        testMethod() {}
      }

      const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
      expect(metadata).toEqual({
        method: 'CONNECT',
        path: '/test',
        middlewares: [],
        options: undefined
      });
    });
  });

  describe('All decorator', () => {
    it('should register ALL route', () => {
      @Controller('/api')
      class TestController {
        @All('/test')
        testMethod() {}
      }

      const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
      expect(metadata).toEqual({
        method: 'ALL',
        path: '/test',
        middlewares: [],
        options: undefined
      });
    });
  });

  describe('Multiple routes on same controller', () => {
    it('should register multiple routes', () => {
      @Controller('/api')
      class TestController {
        @Get('/get')
        getMethod() {}

        @Post('/post')
        postMethod() {}

        @Put('/put')
        putMethod() {}
      }

      const getMetadata = DecoratorRegistry.getRoute(TestController, 'getMethod');
      const postMetadata = DecoratorRegistry.getRoute(TestController, 'postMethod');
      const putMetadata = DecoratorRegistry.getRoute(TestController, 'putMethod');

      expect(getMetadata?.method).toBe('GET');
      expect(postMetadata?.method).toBe('POST');
      expect(putMetadata?.method).toBe('PUT');
    });
  });
});
