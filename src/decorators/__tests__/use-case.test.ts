import { CallUseCase } from '../use-case';
import { DecoratorRegistry } from '../registry';
import { Get } from '../route';
import { Controller } from '../controller';

describe('CallUseCase Decorator', () => {
  beforeEach(() => {
    DecoratorRegistry.clear();
  });

  it('should register use case for route', () => {
    class TestUseCase {
      async execute(input: any) {
        return { result: 'success' };
      }
    }

      @Controller('/api')
      class TestController {
        @CallUseCase(TestUseCase)
        @Get('/test')
        testMethod() {}
      }

    const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
    expect(metadata?.useCase).toBe(TestUseCase);
  });

  it('should not register use case if no route exists', () => {
    class TestUseCase {
      async execute(input: any) {
        return { result: 'success' };
      }
    }

      @Controller('/api')
      class TestController {
        @CallUseCase(TestUseCase)
        testMethod() {}
      }

    const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
    expect(metadata).toBeUndefined();
  });

  it('should work with different use case classes', () => {
    class UseCase1 {
      async execute(input: any) {
        return { result: 'useCase1' };
      }
    }

    class UseCase2 {
      async execute(input: any) {
        return { result: 'useCase2' };
      }
    }

      @Controller('/api')
      class TestController {
        @CallUseCase(UseCase1)
        @Get('/test1')
        method1() {}

        @CallUseCase(UseCase2)
        @Get('/test2')
        method2() {}
      }

    const metadata1 = DecoratorRegistry.getRoute(TestController, 'method1');
    const metadata2 = DecoratorRegistry.getRoute(TestController, 'method2');

    expect(metadata1?.useCase).toBe(UseCase1);
    expect(metadata2?.useCase).toBe(UseCase2);
  });

  it('should work with anonymous use case classes', () => {
    const AnonymousUseCase = class {
      async execute(input: any) {
        return { result: 'anonymous' };
      }
    };

      @Controller('/api')
      class TestController {
        @CallUseCase(AnonymousUseCase)
        @Get('/test')
        testMethod() {}
      }

    const metadata = DecoratorRegistry.getRoute(TestController, 'testMethod');
    expect(metadata?.useCase).toBe(AnonymousUseCase);
  });
});
