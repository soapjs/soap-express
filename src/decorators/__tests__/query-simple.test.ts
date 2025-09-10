import { Query, Scope } from '@soapjs/soap';
import { Query as QueryDecorator, QueryHandlerDecorator } from '../query';
import { DecoratorRegistry } from '../registry';
import { DI } from '@soapjs/soap';

// Mock DI
jest.mock('@soapjs/soap', () => ({
  ...jest.requireActual('@soapjs/soap'),
  DI: {
    registerClass: jest.fn()
  },
  Scope: {
    SINGLETON: 'singleton',
    TRANSIENT: 'transient',
    REQUEST: 'request'
  }
}));

describe('Query Decorators - Simple Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    DecoratorRegistry.clear();
  });

  describe('@Query', () => {
    it('should register query handler with default options', () => {
      class TestQuery {
        constructor(public id: string) {}
      }

      @QueryDecorator(TestQuery as any)
      class TestQueryHandler {
        async handle(query: TestQuery) {
          return { success: true, data: query.id };
        }
      }

      expect(DI.registerClass).toHaveBeenCalledWith(
        TestQueryHandler,
        'QueryHandler:TestQuery',
        { scope: Scope.SINGLETON }
      );

      const queryHandlers = DecoratorRegistry.getQueryHandlers();
      expect(queryHandlers.size).toBe(1);
      expect(queryHandlers.get('QueryHandler:TestQuery')).toEqual({
        queryType: TestQuery,
        handlerClass: TestQueryHandler,
        token: 'QueryHandler:TestQuery',
        scope: 'singleton'
      });
    });

    it('should work with different query types', () => {
      class GetUserQuery {
        constructor(public userId: string) {}
      }

      class GetUsersQuery {
        constructor(public page: number, public limit: number) {}
      }

      @QueryDecorator(GetUserQuery as any)
      class GetUserHandler {
        async handle(query: GetUserQuery) {
          return { success: true, data: { id: query.userId, name: 'Test User' } };
        }
      }

      @QueryDecorator(GetUsersQuery as any)
      class GetUsersHandler {
        async handle(query: GetUsersQuery) {
          return { success: true, data: [] };
        }
      }

      const queryHandlers = DecoratorRegistry.getQueryHandlers();
      expect(queryHandlers.size).toBe(2);
      expect(queryHandlers.has('QueryHandler:GetUserQuery')).toBe(true);
      expect(queryHandlers.has('QueryHandler:GetUsersQuery')).toBe(true);
    });
  });

  describe('@QueryHandler', () => {
    it('should register query handler with custom options', () => {
      class TestQuery {
        constructor(public id: string) {}
      }

      @QueryHandlerDecorator(TestQuery as any, {
        token: 'CustomTestQueryHandler',
        scope: Scope.TRANSIENT
      })
      class TestQueryHandler {
        async handle(query: TestQuery) {
          return { success: true, data: query.id };
        }
      }

      expect(DI.registerClass).toHaveBeenCalledWith(
        TestQueryHandler,
        'CustomTestQueryHandler',
        { scope: Scope.TRANSIENT }
      );

      const queryHandlers = DecoratorRegistry.getQueryHandlers();
      expect(queryHandlers.size).toBe(1);
      expect(queryHandlers.get('CustomTestQueryHandler')).toEqual({
        queryType: TestQuery,
        handlerClass: TestQueryHandler,
        token: 'CustomTestQueryHandler',
        scope: 'transient'
      });
    });

    it('should register query handler with REQUEST scope', () => {
      class TestQuery {
        constructor(public id: string) {}
      }

      @QueryHandlerDecorator(TestQuery as any, {
        token: 'RequestTestQueryHandler',
        scope: Scope.REQUEST
      })
      class TestQueryHandler {
        async handle(query: TestQuery) {
          return { success: true, data: query.id };
        }
      }

      expect(DI.registerClass).toHaveBeenCalledWith(
        TestQueryHandler,
        'RequestTestQueryHandler',
        { scope: Scope.REQUEST }
      );

      const queryHandlers = DecoratorRegistry.getQueryHandlers();
      expect(queryHandlers.get('RequestTestQueryHandler')).toEqual({
        queryType: TestQuery,
        handlerClass: TestQueryHandler,
        token: 'RequestTestQueryHandler',
        scope: 'request'
      });
    });
  });

  describe('Registry Integration', () => {
    it('should clear all query handler registrations', () => {
      class TestQuery {
        constructor(public id: string) {}
      }

      @QueryDecorator(TestQuery as any)
      class TestQueryHandler {
        async handle(query: TestQuery) {
          return { success: true, data: query.id };
        }
      }

      expect(DecoratorRegistry.getQueryHandlers().size).toBe(1);

      DecoratorRegistry.clear();

      expect(DecoratorRegistry.getQueryHandlers().size).toBe(0);
    });

    it('should get specific query handler by token', () => {
      class TestQuery {
        constructor(public id: string) {}
      }

      @QueryHandlerDecorator(TestQuery as any, { token: 'SpecificHandler' })
      class TestQueryHandler {
        async handle(query: TestQuery) {
          return { success: true, data: query.id };
        }
      }

      const handler = DecoratorRegistry.getQueryHandler('SpecificHandler');

      expect(handler).toBeDefined();
      expect(handler?.handlerClass).toBe(TestQueryHandler);
      expect(handler?.queryType).toBe(TestQuery);
    });

    it('should return undefined for non-existent query handler', () => {
      const handler = DecoratorRegistry.getQueryHandler('NonExistent');

      expect(handler).toBeUndefined();
    });
  });
});
