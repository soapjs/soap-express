import { AuthRegistry } from '../registry';
import { AuthStrategy } from '@soapjs/soap';

describe('AuthRegistry', () => {
  let registry: AuthRegistry;
  let mockStrategy: AuthStrategy;

  beforeEach(() => {
    registry = new AuthRegistry();
    mockStrategy = {
      name: 'jwt',
      middleware: jest.fn()
    } as any;
  });

  describe('register', () => {
    it('should register a strategy', () => {
      registry.register(mockStrategy);

      expect(registry.has('jwt')).toBe(true);
      expect(registry.get('jwt')).toBe(mockStrategy);
    });

    it('should register multiple strategies', () => {
      const strategy1 = { ...mockStrategy, name: 'jwt' };
      const strategy2 = { ...mockStrategy, name: 'oauth' };

      registry.register(strategy1);
      registry.register(strategy2);

      expect(registry.has('jwt')).toBe(true);
      expect(registry.has('oauth')).toBe(true);
      expect(registry.get('jwt')).toBe(strategy1);
      expect(registry.get('oauth')).toBe(strategy2);
    });

    it('should overwrite existing strategy with same name', () => {
      const strategy1 = { ...mockStrategy, name: 'jwt' };
      const strategy2 = { ...mockStrategy, name: 'jwt' };

      registry.register(strategy1);
      registry.register(strategy2);

      expect(registry.get('jwt')).toBe(strategy2);
    });
  });

  describe('get', () => {
    it('should return strategy if exists', () => {
      registry.register(mockStrategy);

      const result = registry.get('jwt');

      expect(result).toBe(mockStrategy);
    });

    it('should return undefined if strategy does not exist', () => {
      const result = registry.get('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true if strategy exists', () => {
      registry.register(mockStrategy);

      expect(registry.has('jwt')).toBe(true);
    });

    it('should return false if strategy does not exist', () => {
      expect(registry.has('nonexistent')).toBe(false);
    });
  });

  describe('getAll', () => {
    it('should return all registered strategies', () => {
      const strategy1 = { ...mockStrategy, name: 'jwt' };
      const strategy2 = { ...mockStrategy, name: 'oauth' };

      registry.register(strategy1);
      registry.register(strategy2);

      const allStrategies = registry.getAll();

      expect(allStrategies).toHaveLength(2);
      expect(allStrategies).toContain(strategy1);
      expect(allStrategies).toContain(strategy2);
    });

    it('should return empty array if no strategies registered', () => {
      const allStrategies = registry.getAll();

      expect(allStrategies).toEqual([]);
    });
  });

  describe('getNames', () => {
    it('should return all strategy names', () => {
      const strategy1 = { ...mockStrategy, name: 'jwt' };
      const strategy2 = { ...mockStrategy, name: 'oauth' };

      registry.register(strategy1);
      registry.register(strategy2);

      const names = registry.getNames();

      expect(names).toHaveLength(2);
      expect(names).toContain('jwt');
      expect(names).toContain('oauth');
    });

    it('should return empty array if no strategies registered', () => {
      const names = registry.getNames();

      expect(names).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should clear all strategies', () => {
      registry.register(mockStrategy);

      expect(registry.has('jwt')).toBe(true);

      registry.clear();

      expect(registry.has('jwt')).toBe(false);
      expect(registry.getAll()).toEqual([]);
      expect(registry.getNames()).toEqual([]);
    });

    it('should work on empty registry', () => {
      expect(() => registry.clear()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty string as strategy name', () => {
      const emptyStrategy = { ...mockStrategy, name: '' };

      registry.register(emptyStrategy);

      expect(registry.has('')).toBe(true);
      expect(registry.get('')).toBe(emptyStrategy);
    });

    it('should handle special characters in strategy name', () => {
      const specialStrategy = { ...mockStrategy, name: 'strategy-with-dashes' };

      registry.register(specialStrategy);

      expect(registry.has('strategy-with-dashes')).toBe(true);
      expect(registry.get('strategy-with-dashes')).toBe(specialStrategy);
    });

    it('should handle case sensitivity', () => {
      const upperStrategy = { ...mockStrategy, name: 'JWT' };
      const lowerStrategy = { ...mockStrategy, name: 'jwt' };

      registry.register(upperStrategy);

      expect(registry.has('JWT')).toBe(true);
      expect(registry.has('jwt')).toBe(false);
      expect(registry.get('JWT')).toBe(upperStrategy);
      expect(registry.get('jwt')).toBeUndefined();
    });
  });
});
