import { SoapExpressPlugin, PluginManager, PluginRegistry, PluginDiscovery } from '../types/plugin';
import { SoapExpressApp } from '../app';
import { SoapExpressPluginRegistry } from './plugin-registry';
import { SoapExpressPluginDiscovery } from './plugin-discovery';

export class SoapExpressPluginManager implements PluginManager {
  private registry: PluginRegistry;
  private discovery: PluginDiscovery;

  constructor(registry?: PluginRegistry, discovery?: PluginDiscovery) {
    this.registry = registry || new SoapExpressPluginRegistry();
    this.discovery = discovery || new SoapExpressPluginDiscovery();
  }

  usePlugin(plugin: SoapExpressPlugin, options?: any): SoapExpressApp {
    // Register plugin if not already registered
    if (!this.registry.get(plugin.name)) {
      this.registry.register(plugin);
    }

    // Install plugin
    this.registry.install(this.getApp(), plugin.name, options);

    return this.getApp();
  }

  async loadPlugin(pluginName: string, options?: any): Promise<SoapExpressApp> {
    // Try to load plugin from registry first
    let plugin = this.registry.get(pluginName);
    
    if (!plugin) {
      // Try to discover and load plugin
      try {
        plugin = await this.discovery.load(pluginName);
        this.registry.register(plugin);
      } catch (error) {
        throw new Error(`Failed to load plugin '${pluginName}': ${error.message}`);
      }
    }

    // Install plugin
    this.registry.install(this.getApp(), pluginName, options);

    return this.getApp();
  }

  unloadPlugin(pluginName: string): SoapExpressApp {
    this.registry.uninstall(this.getApp(), pluginName);
    return this.getApp();
  }

  listPlugins(): SoapExpressPlugin[] {
    return this.registry.list();
  }

  getPlugin(pluginName: string): SoapExpressPlugin | undefined {
    return this.registry.get(pluginName);
  }

  isPluginLoaded(pluginName: string): boolean {
    return this.registry.isInstalled(pluginName);
  }

  getInstalled(): SoapExpressPlugin[] {
    return this.registry.getInstalled();
  }

  async loadPluginsFromDirectory(dir: string): Promise<SoapExpressApp> {
    try {
      const plugins = await this.discovery.discover(dir);
      
      for (const plugin of plugins) {
        // Register plugin
        this.registry.register(plugin);
        
        // Install plugin if it should be auto-loaded
        if (this.shouldAutoLoad(plugin)) {
          this.registry.install(this.getApp(), plugin.name);
        }
      }

      return this.getApp();
    } catch (error) {
      throw new Error(`Failed to load plugins from directory '${dir}': ${error.message}`);
    }
  }

  private shouldAutoLoad(plugin: SoapExpressPlugin): boolean {
    // Check if plugin has autoLoad configuration
    if (plugin.config && typeof plugin.config.autoLoad === 'boolean') {
      return plugin.config.autoLoad;
    }

    // Default to true for most plugins
    return true;
  }

  private getApp(): SoapExpressApp {
    return this.getAppInstance();
  }

  // Method to set the app instance (called by SoapExpressApp)
  setApp(app: SoapExpressApp): void {
    (this as any).app = app;
  }

  private getAppInstance(): SoapExpressApp {
    return (this as any).app;
  }
}
