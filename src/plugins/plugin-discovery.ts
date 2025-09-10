import { readdir, stat } from 'fs/promises';
import { join, extname } from 'path';
import { SoapExpressPlugin, PluginDiscovery } from '../types/plugin';

export class SoapExpressPluginDiscovery implements PluginDiscovery {
  private supportedExtensions = ['.js', '.ts', '.mjs'];

  async discover(directory: string): Promise<SoapExpressPlugin[]> {
    const plugins: SoapExpressPlugin[] = [];

    try {
      const entries = await readdir(directory, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(directory, entry.name);

        if (entry.isDirectory()) {
          // Recursively discover plugins in subdirectories
          const subPlugins = await this.discover(fullPath);
          plugins.push(...subPlugins);
        } else if (entry.isFile() && this.isPluginFile(entry.name)) {
          try {
            const plugin = await this.load(fullPath);
            plugins.push(plugin);
          } catch (error) {
            console.warn(`Failed to load plugin from ${fullPath}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to discover plugins in directory '${directory}': ${error.message}`);
    }

    return plugins;
  }

  async load(pluginPath: string): Promise<SoapExpressPlugin> {
    try {
      // Dynamic import of the plugin
      const pluginModule = await import(pluginPath);
      
      // Try different export patterns
      let plugin: SoapExpressPlugin;
      
      if (pluginModule.default) {
        plugin = pluginModule.default;
      } else if (pluginModule.Plugin) {
        plugin = pluginModule.Plugin;
      } else if (pluginModule[Object.keys(pluginModule)[0]]) {
        plugin = pluginModule[Object.keys(pluginModule)[0]];
      } else {
        throw new Error('No valid plugin export found');
      }

      // Validate plugin
      this.validate(plugin);

      return plugin;
    } catch (error) {
      throw new Error(`Failed to load plugin from '${pluginPath}': ${error.message}`);
    }
  }

  validate(plugin: SoapExpressPlugin): boolean {
    if (!plugin) {
      throw new Error('Plugin is null or undefined');
    }

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

    return true;
  }

  private isPluginFile(filename: string): boolean {
    const ext = extname(filename);
    return this.supportedExtensions.includes(ext) && 
           (filename.includes('plugin') || filename.includes('Plugin'));
  }
}
