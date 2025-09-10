import { Auth, AdminOnly, RolesOnly, Public, SelfOnly } from '../auth';

describe('Auth Decorators', () => {
  beforeEach(() => {
    // Clear auth metadata before each test
    class TestController {
      static __authMetadata = new Map();
    }
  });

  describe('Auth decorator', () => {
    it('should register auth with string strategy', () => {
      class TestController {
        @Auth('jwt')
        testMethod() {}
      }

      const authMetadata = (TestController as any).__authMetadata;
      expect(authMetadata).toBeDefined();
      expect(authMetadata.get('testMethod')).toEqual({
        strategy: 'jwt',
        required: true
      });
    });

    it('should register auth with options object', () => {
      const options = {
        strategy: 'jwt',
        roles: { allow: ['admin'] },
        required: true
      };

      class TestController {
        @Auth(options)
        testMethod() {}
      }

      const authMetadata = (TestController as any).__authMetadata;
      expect(authMetadata.get('testMethod')).toEqual(options);
    });

    it('should default required to true when not specified', () => {
      const options = {
        strategy: 'jwt',
        roles: { allow: ['user'] }
      };

      class TestController {
        @Auth(options)
        testMethod() {}
      }

      const authMetadata = (TestController as any).__authMetadata;
      expect(authMetadata.get('testMethod')).toEqual({
        ...options,
        required: true
      });
    });

    it('should handle empty options', () => {
      class TestController {
        @Auth()
        testMethod() {}
      }

      const authMetadata = (TestController as any).__authMetadata;
      expect(authMetadata.get('testMethod')).toEqual({
        required: true
      });
    });

    it('should handle multiple methods on same controller', () => {
      class TestController {
        @Auth('jwt')
        method1() {}

        @Auth({ strategy: 'oauth', required: false })
        method2() {}
      }

      const authMetadata = (TestController as any).__authMetadata;
      expect(authMetadata.get('method1')).toEqual({
        strategy: 'jwt',
        required: true
      });
      expect(authMetadata.get('method2')).toEqual({
        strategy: 'oauth',
        required: false
      });
    });
  });

  describe('AdminOnly decorator', () => {
    it('should register admin-only auth', () => {
      class TestController {
        @AdminOnly()
        testMethod() {}
      }

      const authMetadata = (TestController as any).__authMetadata;
      expect(authMetadata.get('testMethod')).toEqual({
        strategy: undefined,
        roles: { allow: ['admin'] },
        required: true
      });
    });

    it('should register admin-only auth with strategy', () => {
      class TestController {
        @AdminOnly('jwt')
        testMethod() {}
      }

      const authMetadata = (TestController as any).__authMetadata;
      expect(authMetadata.get('testMethod')).toEqual({
        strategy: 'jwt',
        roles: { allow: ['admin'] },
        required: true
      });
    });
  });

  describe('RolesOnly decorator', () => {
    it('should register specific roles auth', () => {
      const roles = ['admin', 'moderator'];

      class TestController {
        @RolesOnly(roles)
        testMethod() {}
      }

      const authMetadata = (TestController as any).__authMetadata;
      expect(authMetadata.get('testMethod')).toEqual({
        strategy: undefined,
        roles: { allow: roles },
        required: true
      });
    });

    it('should register specific roles auth with strategy', () => {
      const roles = ['user', 'premium'];

      class TestController {
        @RolesOnly(roles, 'oauth')
        testMethod() {}
      }

      const authMetadata = (TestController as any).__authMetadata;
      expect(authMetadata.get('testMethod')).toEqual({
        strategy: 'oauth',
        roles: { allow: roles },
        required: true
      });
    });
  });

  describe('Public decorator', () => {
    it('should register public (no auth required) method', () => {
      class TestController {
        @Public()
        testMethod() {}
      }

      const authMetadata = (TestController as any).__authMetadata;
      expect(authMetadata.get('testMethod')).toEqual({
        required: false
      });
    });
  });

  describe('SelfOnly decorator', () => {
    it('should register self-only auth', () => {
      class TestController {
        @SelfOnly()
        testMethod() {}
      }

      const authMetadata = (TestController as any).__authMetadata;
      expect(authMetadata.get('testMethod')).toEqual({
        strategy: undefined,
        roles: { selfOnly: true },
        required: true
      });
    });

    it('should register self-only auth with strategy', () => {
      class TestController {
        @SelfOnly('jwt')
        testMethod() {}
      }

      const authMetadata = (TestController as any).__authMetadata;
      expect(authMetadata.get('testMethod')).toEqual({
        strategy: 'jwt',
        roles: { selfOnly: true },
        required: true
      });
    });
  });

  describe('Multiple auth decorators', () => {
    it('should handle multiple methods with different auth requirements', () => {
      class TestController {
        @Public()
        publicMethod() {}

        @AdminOnly('jwt')
        adminMethod() {}

        @RolesOnly(['user', 'premium'])
        userMethod() {}

        @SelfOnly('oauth')
        selfMethod() {}
      }

      const authMetadata = (TestController as any).__authMetadata;
      expect(authMetadata.get('publicMethod')).toEqual({ required: false });
      expect(authMetadata.get('adminMethod')).toEqual({
        strategy: 'jwt',
        roles: { allow: ['admin'] },
        required: true
      });
      expect(authMetadata.get('userMethod')).toEqual({
        strategy: undefined,
        roles: { allow: ['user', 'premium'] },
        required: true
      });
      expect(authMetadata.get('selfMethod')).toEqual({
        strategy: 'oauth',
        roles: { selfOnly: true },
        required: true
      });
    });
  });
});
