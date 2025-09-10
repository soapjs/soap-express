import { SoapExpressPlugin, PluginRegistry } from '../types/plugin';
import { SoapExpressApp } from '../app';

export class SoapExpressPluginRegistry implements PluginRegistry {
  private plugins = new Map<string, SoapExpressPlugin>();
  private installedPlugins = new Set<string>();

  register(plugin: SoapExpressPlugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin '${plugin.name}' is already registered`);
    }

    // Validate plugin
    this.validatePlugin(plugin);

    this.plugins.set(plugin.name, plugin);
  }

  unregister(pluginName: string): void {
    if (this.installedPlugins.has(pluginName)) {
      throw new Error(`Cannot unregister plugin '${pluginName}' while it's installed`);
    }
    
    this.plugins.delete(pluginName);
  }

  get(pluginName: string): SoapExpressPlugin | undefined {
    return this.plugins.get(pluginName);
  }

  list(): SoapExpressPlugin[] {
    return Array.from(this.plugins.values());
  }

  install(app: SoapExpressApp, pluginName: string, options?: any): void {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin '${pluginName}' not found`);
    }

    if (this.installedPlugins.has(pluginName)) {
      throw new Error(`Plugin '${pluginName}' is already installed`);
    }

    // Check dependencies
    this.checkDependencies(plugin);

    try {
      // Mark as installed before calling install to prevent circular dependencies
      this.installedPlugins.add(pluginName);
      plugin.installed = true;
      plugin.enabled = true;

      // Call plugin install method
      plugin.install(app, options);

      console.log(`Plugin '${pluginName}' installed successfully`);
    } catch (error) {
      // Rollback on error
      this.installedPlugins.delete(pluginName);
      plugin.installed = false;
      plugin.enabled = false;
      throw new Error(`Failed to install plugin '${pluginName}': ${error.message}`);
    }
  }

  uninstall(app: SoapExpressApp, pluginName: string): void {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin '${pluginName}' not found`);
    }

    if (!this.installedPlugins.has(pluginName)) {
      throw new Error(`Plugin '${pluginName}' is not installed`);
    }

    try {
      // Call plugin uninstall method if it exists
      if (plugin.uninstall) {
        plugin.uninstall(app);
      }

      // Mark as uninstalled
      this.installedPlugins.delete(pluginName);
      plugin.installed = false;
      plugin.enabled = false;

      console.log(`Plugin '${pluginName}' uninstalled successfully`);
    } catch (error) {
      throw new Error(`Failed to uninstall plugin '${pluginName}': ${error.message}`);
    }
  }

  isInstalled(pluginName: string): boolean {
    return this.installedPlugins.has(pluginName);
  }

  getInstalled(): SoapExpressPlugin[] {
    return Array.from(this.installedPlugins)
      .map(name => this.plugins.get(name))
      .filter(Boolean) as SoapExpressPlugin[];
  }

  private validatePlugin(plugin: SoapExpressPlugin): void {
    if (!plugin.name || typeof plugin.name !== 'string') {
      throw new Error('Plugin must have a valid name');
    }

    if (!plugin.version || typeof plugin.version !== 'string') {
      throw new Error('Plugin must have a valid version');
    }

    if (!plugin.install || typeof plugin.install !== 'function') {
      throw new Error('Plugin must implement install method');
    }

    // Validate version format (semantic versioning)
    const versionRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
    if (!versionRegex.test(plugin.version)) {
      throw new Error('Plugin version must follow semantic versioning format');
    }
  }

  private checkDependencies(plugin: SoapExpressPlugin): void {
    if (!plugin.dependencies) {
      return;
    }

    for (const dependency of plugin.dependencies) {
      if (!this.installedPlugins.has(dependency)) {
        throw new Error(`Plugin '${plugin.name}' requires dependency '${dependency}' to be installed first`);
      }
    }
  }
}
