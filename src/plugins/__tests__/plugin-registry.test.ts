import { SoapExpressPluginRegistry } from '../plugin-registry';
import { SoapExpressPlugin } from '../../types/plugin';
import { SoapExpressApp } from '../../app';

// Mock plugin for testing
class MockPlugin implements SoapExpressPlugin {
  readonly name = 'mock-plugin';
  readonly version = '1.0.0';
  readonly description = 'Mock plugin for testing';
  
  installCalled = false;
  uninstallCalled = false;
  installOptions: any = null;

  install(app: SoapExpressApp, options?: any): void {
    this.installCalled = true;
    this.installOptions = options;
  }

  uninstall(app: SoapExpressApp): void {
    this.uninstallCalled = true;
  }
}

describe('SoapExpressPluginRegistry', () => {
  let registry: SoapExpressPluginRegistry;
  let mockApp: SoapExpressApp;
  let mockPlugin: MockPlugin;

  beforeEach(() => {
    registry = new SoapExpressPluginRegistry();
    mockApp = {} as SoapExpressApp;
    mockPlugin = new MockPlugin();
  });

  describe('register', () => {
    it('should register a plugin successfully', () => {
      registry.register(mockPlugin);
      
      const registeredPlugin = registry.get('mock-plugin');
      expect(registeredPlugin).toBe(mockPlugin);
    });

    it('should throw error when registering duplicate plugin', () => {
      registry.register(mockPlugin);
      
      expect(() => {
        registry.register(mockPlugin);
      }).toThrow("Plugin 'mock-plugin' is already registered");
    });

    it('should validate plugin before registration', () => {
      const invalidPlugin = {} as SoapExpressPlugin;
      
      expect(() => {
        registry.register(invalidPlugin);
      }).toThrow('Plugin must have a valid name');
    });
  });

  describe('install', () => {
    beforeEach(() => {
      registry.register(mockPlugin);
    });

    it('should install a plugin successfully', () => {
      registry.install(mockApp, 'mock-plugin', { test: true });
      
      expect(mockPlugin.installCalled).toBe(true);
      expect(mockPlugin.installOptions).toEqual({ test: true });
      expect(registry.isInstalled('mock-plugin')).toBe(true);
    });

    it('should throw error when installing non-existent plugin', () => {
      expect(() => {
        registry.install(mockApp, 'non-existent');
      }).toThrow("Plugin 'non-existent' not found");
    });

    it('should throw error when installing already installed plugin', () => {
      registry.install(mockApp, 'mock-plugin');
      
      expect(() => {
        registry.install(mockApp, 'mock-plugin');
      }).toThrow("Plugin 'mock-plugin' is already installed");
    });
  });

  describe('uninstall', () => {
    beforeEach(() => {
      registry.register(mockPlugin);
      registry.install(mockApp, 'mock-plugin');
    });

    it('should uninstall a plugin successfully', () => {
      registry.uninstall(mockApp, 'mock-plugin');
      
      expect(mockPlugin.uninstallCalled).toBe(true);
      expect(registry.isInstalled('mock-plugin')).toBe(false);
    });

    it('should throw error when uninstalling non-existent plugin', () => {
      expect(() => {
        registry.uninstall(mockApp, 'non-existent');
      }).toThrow("Plugin 'non-existent' not found");
    });

    it('should throw error when uninstalling not installed plugin', () => {
      registry.uninstall(mockApp, 'mock-plugin');
      
      expect(() => {
        registry.uninstall(mockApp, 'mock-plugin');
      }).toThrow("Plugin 'mock-plugin' is not installed");
    });
  });

  describe('list and get', () => {
    it('should list all registered plugins', () => {
      const plugin1 = new MockPlugin();
      (plugin1 as any).name = 'plugin1';
      const plugin2 = new MockPlugin();
      (plugin2 as any).name = 'plugin2';
      
      registry.register(plugin1);
      registry.register(plugin2);
      
      const plugins = registry.list();
      expect(plugins).toHaveLength(2);
      expect(plugins).toContain(plugin1);
      expect(plugins).toContain(plugin2);
    });

    it('should get specific plugin by name', () => {
      registry.register(mockPlugin);
      
      const plugin = registry.get('mock-plugin');
      expect(plugin).toBe(mockPlugin);
    });

    it('should return undefined for non-existent plugin', () => {
      const plugin = registry.get('non-existent');
      expect(plugin).toBeUndefined();
    });
  });

  describe('getInstalled', () => {
    it('should return only installed plugins', () => {
      const plugin1 = new MockPlugin();
      (plugin1 as any).name = 'plugin1';
      const plugin2 = new MockPlugin();
      (plugin2 as any).name = 'plugin2';
      
      registry.register(plugin1);
      registry.register(plugin2);
      registry.install(mockApp, 'plugin1');
      
      const installed = registry.getInstalled();
      expect(installed).toHaveLength(1);
      expect(installed[0]).toBe(plugin1);
    });
  });
});
