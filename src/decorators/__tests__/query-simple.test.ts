import { QueryHandler } from '../query';
import { DecoratorRegistry } from '../registry';

describe('QueryHandler decorator', () => {
  beforeEach(() => {
    DecoratorRegistry.clear();
  });

  describe('default options', () => {
    it('registers metadata in DecoratorRegistry with default token and singleton scope', () => {
      class TestQuery {
        constructor(public id: string) {}
      }

      @QueryHandler(TestQuery as any)
      class TestQueryHandler {
        async handle(query: TestQuery) {
          return { id: query.id };
        }
      }

      const handlers = DecoratorRegistry.getQueryHandlers();
      expect(handlers.size).toBe(1);
      expect(handlers.get('QueryHandler:TestQuery')).toEqual({
        queryType: TestQuery,
        handlerClass: TestQueryHandler,
        token: 'QueryHandler:TestQuery',
        scope: 'singleton',
      });
    });

    it('does NOT call DI.bind() — DI wiring is deferred to wireCqrs()', () => {
      class NoopQuery {}

      expect(() => {
        @QueryHandler(NoopQuery as any)
        class NoopHandler { async handle() {} }
      }).not.toThrow();
    });

    it('works with multiple query types', () => {
      class GetUserQuery {}
      class GetUsersQuery {}

      @QueryHandler(GetUserQuery as any)
      class GetUserHandler { async handle() {} }

      @QueryHandler(GetUsersQuery as any)
      class GetUsersHandler { async handle() {} }

      const handlers = DecoratorRegistry.getQueryHandlers();
      expect(handlers.size).toBe(2);
      expect(handlers.has('QueryHandler:GetUserQuery')).toBe(true);
      expect(handlers.has('QueryHandler:GetUsersQuery')).toBe(true);
    });
  });

  describe('custom options', () => {
    it('uses a custom token when provided', () => {
      class TestQuery {}

      @QueryHandler(TestQuery as any, { token: 'MyCustomQueryHandler' })
      class TestQueryHandler { async handle() {} }

      const meta = DecoratorRegistry.getQueryHandler('MyCustomQueryHandler');
      expect(meta).toBeDefined();
      expect(meta?.token).toBe('MyCustomQueryHandler');
      expect(meta?.handlerClass).toBe(TestQueryHandler);
    });

    it('stores the supplied scope', () => {
      class TestQuery {}

      @QueryHandler(TestQuery as any, { scope: 'transient' as any })
      class TestQueryHandler { async handle() {} }

      const meta = DecoratorRegistry.getQueryHandler('QueryHandler:TestQuery');
      expect(meta?.scope).toBe('transient');
    });
  });

  describe('registry helpers', () => {
    it('getQueryHandler returns undefined for unknown token', () => {
      expect(DecoratorRegistry.getQueryHandler('NonExistent')).toBeUndefined();
    });

    it('clear() removes all query handler registrations', () => {
      class AQuery {}

      @QueryHandler(AQuery as any)
      class AHandler { async handle() {} }

      expect(DecoratorRegistry.getQueryHandlers().size).toBe(1);
      DecoratorRegistry.clear();
      expect(DecoratorRegistry.getQueryHandlers().size).toBe(0);
    });

    it('getQueryHandler returns the right handler class', () => {
      class SpecificQuery {}

      @QueryHandler(SpecificQuery as any, { token: 'SpecificQueryHandler' })
      class SpecificHandler { async handle() {} }

      const meta = DecoratorRegistry.getQueryHandler('SpecificQueryHandler');
      expect(meta?.handlerClass).toBe(SpecificHandler);
      expect(meta?.queryType).toBe(SpecificQuery);
    });
  });
});
