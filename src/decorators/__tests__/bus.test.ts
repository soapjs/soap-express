import { CommandBus, QueryBus } from '../bus';
import { DecoratorRegistry } from '../registry';

describe('CommandBus / QueryBus decorators', () => {
  beforeEach(() => {
    DecoratorRegistry.clear();
  });

  // ── @CommandBus ────────────────────────────────────────────────────────────

  describe('@CommandBus', () => {
    it('registers with default token and singleton scope', () => {
      @CommandBus()
      class TestCommandBus {
        register() {}
        async dispatch() { return {} as any; }
      }

      const buses = DecoratorRegistry.getCommandBuses();
      expect(buses.size).toBe(1);
      expect(buses.get('CommandBus')).toEqual({
        busClass: TestCommandBus,
        token: 'CommandBus',
        scope: 'singleton',
      });
    });

    it('registers with a custom token', () => {
      @CommandBus({ token: 'RedisCommandBus' })
      class RedisCommandBus {
        register() {}
        async dispatch() { return {} as any; }
      }

      const meta = DecoratorRegistry.getCommandBus('RedisCommandBus');
      expect(meta?.busClass).toBe(RedisCommandBus);
      expect(meta?.token).toBe('RedisCommandBus');
    });

    it('stores the supplied scope', () => {
      @CommandBus({ token: 'TransientBus', scope: 'transient' as any })
      class TransientCommandBus {
        register() {}
        async dispatch() { return {} as any; }
      }

      const meta = DecoratorRegistry.getCommandBus('TransientBus');
      expect(meta?.scope).toBe('transient');
    });

    it('supports multiple command bus registrations', () => {
      @CommandBus({ token: 'Bus1' })
      class Bus1 { register() {} async dispatch() { return {} as any; } }

      @CommandBus({ token: 'Bus2' })
      class Bus2 { register() {} async dispatch() { return {} as any; } }

      const buses = DecoratorRegistry.getCommandBuses();
      expect(buses.size).toBe(2);
      expect(buses.has('Bus1')).toBe(true);
      expect(buses.has('Bus2')).toBe(true);
    });

    it('does NOT call DI.bind()', () => {
      expect(() => {
        @CommandBus()
        class NoBind { register() {} async dispatch() { return {} as any; } }
      }).not.toThrow();
    });
  });

  // ── @QueryBus ──────────────────────────────────────────────────────────────

  describe('@QueryBus', () => {
    it('registers with default token and singleton scope', () => {
      @QueryBus()
      class TestQueryBus {
        register() {}
        async dispatch() { return {} as any; }
      }

      const buses = DecoratorRegistry.getQueryBuses();
      expect(buses.size).toBe(1);
      expect(buses.get('QueryBus')).toEqual({
        busClass: TestQueryBus,
        token: 'QueryBus',
        scope: 'singleton',
      });
    });

    it('registers with a custom token', () => {
      @QueryBus({ token: 'CachedQueryBus' })
      class CachedQueryBus {
        register() {}
        async dispatch() { return {} as any; }
      }

      const meta = DecoratorRegistry.getQueryBus('CachedQueryBus');
      expect(meta?.busClass).toBe(CachedQueryBus);
    });

    it('stores the supplied scope', () => {
      @QueryBus({ token: 'TransientQueryBus', scope: 'transient' as any })
      class TransientQueryBus {
        register() {}
        async dispatch() { return {} as any; }
      }

      const meta = DecoratorRegistry.getQueryBus('TransientQueryBus');
      expect(meta?.scope).toBe('transient');
    });

    it('supports multiple query bus registrations', () => {
      @QueryBus({ token: 'QBus1' })
      class QBus1 { register() {} async dispatch() { return {} as any; } }

      @QueryBus({ token: 'QBus2' })
      class QBus2 { register() {} async dispatch() { return {} as any; } }

      const buses = DecoratorRegistry.getQueryBuses();
      expect(buses.size).toBe(2);
    });

    it('does NOT call DI.bind()', () => {
      expect(() => {
        @QueryBus()
        class NoBind { register() {} async dispatch() { return {} as any; } }
      }).not.toThrow();
    });
  });

  // ── Registry helpers ───────────────────────────────────────────────────────

  describe('registry helpers', () => {
    it('clear() removes all bus registrations', () => {
      @CommandBus({ token: 'CBus' })
      class CBus { register() {} async dispatch() { return {} as any; } }

      @QueryBus({ token: 'QBus' })
      class QBus { register() {} async dispatch() { return {} as any; } }

      expect(DecoratorRegistry.getCommandBuses().size).toBe(1);
      expect(DecoratorRegistry.getQueryBuses().size).toBe(1);

      DecoratorRegistry.clear();

      expect(DecoratorRegistry.getCommandBuses().size).toBe(0);
      expect(DecoratorRegistry.getQueryBuses().size).toBe(0);
    });

    it('returns undefined for non-existent bus tokens', () => {
      expect(DecoratorRegistry.getCommandBus('Missing')).toBeUndefined();
      expect(DecoratorRegistry.getQueryBus('Missing')).toBeUndefined();
    });
  });
});
