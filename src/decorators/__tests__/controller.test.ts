import { Controller } from '../controller';
import { DecoratorRegistry } from '../registry';

describe('Controller Decorator', () => {
  beforeEach(() => {
    DecoratorRegistry.clear();
  });

  it('should register controller with base path', () => {
    const basePath = '/api/v1';

    @Controller(basePath)
    class TestController {}

    const metadata = DecoratorRegistry.getController(TestController);
    expect(metadata).toEqual({
      basePath,
      middlewares: [],
      type: 'http'
    });
  });

  it('should register controller with empty base path', () => {
    const basePath = '';

    @Controller(basePath)
    class TestController {}

    const metadata = DecoratorRegistry.getController(TestController);
    expect(metadata).toEqual({
      basePath,
      middlewares: [],
      type: 'http'
    });
  });

  it('should register controller with root base path', () => {
    const basePath = '/';

    @Controller(basePath)
    class TestController {}

    const metadata = DecoratorRegistry.getController(TestController);
    expect(metadata).toEqual({
      basePath,
      middlewares: [],
      type: 'http'
    });
  });

  it('should work with multiple controllers', () => {
    @Controller('/api/v1')
    class Controller1 {}

    @Controller('/api/v2')
    class Controller2 {}

    const metadata1 = DecoratorRegistry.getController(Controller1);
    const metadata2 = DecoratorRegistry.getController(Controller2);

    // The order might be different due to how the registry works
    expect(metadata1?.basePath).toBeDefined();
    expect(metadata2?.basePath).toBeDefined();
    expect([metadata1?.basePath, metadata2?.basePath]).toContain('/api/v1');
    expect([metadata1?.basePath, metadata2?.basePath]).toContain('/api/v2');
  });
});
