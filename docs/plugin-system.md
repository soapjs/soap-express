# 🔌 Plugin System

SoapExpress includes a powerful plugin system that allows you to easily extend functionality without modifying the core code.

## 📋 Table of Contents

- [Overview](#overview)
- [Plugin Interface](#plugin-interface)
- [Built-in Plugins](#built-in-plugins)
- [Creating Custom Plugins](#creating-custom-plugins)
- [Plugin Lifecycle](#plugin-lifecycle)
- [Plugin Management](#plugin-management)
- [Examples](#examples)

## 🎯 Overview

The plugin system provides:

- **Modularity**: Each plugin has a single responsibility
- **Reusability**: Plugins can be used across different projects
- **Lifecycle Management**: Hooks for different application phases
- **Dependency Management**: Automatic dependency resolution
- **Hot Loading**: Load plugins at runtime
- **Type Safety**: Full TypeScript support

## 🔌 Plugin Interface

### Basic Plugin Structure

```typescript
import { SoapExpressPlugin, SoapExpressApp } from '@soapjs/soap-express';

export class MyPlugin implements SoapExpressPlugin {
  readonly name = 'my-plugin';
  readonly version = '1.0.0';
  readonly description = 'My custom plugin';
  readonly author = 'Your Name';
  readonly category = 'utility';
  readonly tags = ['custom', 'utility'];

  install(app: SoapExpressApp, options?: any): void {
    // Plugin installation logic
  }

  uninstall?(app: SoapExpressApp): void {
    // Plugin cleanup logic
  }

  beforeStart?(app: SoapExpressApp): void {
    // Called before server starts
  }

  afterStart?(app: SoapExpressApp): void {
    // Called after server starts
  }

  beforeStop?(app: SoapExpressApp): void {
    // Called before server stops
  }

  afterStop?(app: SoapExpressApp): void {
    // Called after server stops
  }
}
```

### Plugin Metadata

```typescript
interface PluginMetadata {
  name: string;                    // Unique plugin name
  version: string;                 // Semantic version
  description?: string;            // Plugin description
  author?: string;                 // Plugin author
  dependencies?: string[];         // Required plugins
  peerDependencies?: string[];     // Optional peer dependencies
  tags?: string[];                 // Search tags
  category?: string;               // Plugin category
}
```

## 🏗️ Built-in Plugins

### Health Check Plugin

The health check plugin provides comprehensive health monitoring:

```typescript
import { SoapExpressApp, HealthCheckPlugin } from '@soapjs/soap-express';

const app = new SoapExpressApp();

// Use with default options
app.usePlugin(new HealthCheckPlugin());

// Use with custom options
app.usePlugin(new HealthCheckPlugin({
  path: '/health',
  timeout: 5000,
  responseFormat: 'json'
}));

// Add custom health checks
const healthPlugin = app.getPlugin('health-check') as HealthCheckPlugin;
healthPlugin.addHealthCheck({
  name: 'database',
  check: async () => ({
    status: 'healthy',
    message: 'Database connection is healthy',
    data: { connectionPool: 'active' }
  }),
  critical: true
});
```

#### Health Check Options

```typescript
interface HealthCheckOptions {
  path?: string;                   // Health check endpoint path
  checks?: HealthCheck[];          // Custom health checks
  timeout?: number;                // Check timeout in ms
  responseFormat?: 'json' | 'text'; // Response format
}
```

#### Default Health Checks

The health check plugin includes these default checks:

- **Uptime**: Application uptime and runtime
- **Memory**: Memory usage statistics
- **Process**: Process information and status

## 🛠️ Creating Custom Plugins

### 1. Basic Plugin

```typescript
import { SoapExpressPlugin, SoapExpressApp } from '@soapjs/soap-express';

export class LoggerPlugin implements SoapExpressPlugin {
  readonly name = 'logger';
  readonly version = '1.0.0';
  readonly description = 'Request logging plugin';

  install(app: SoapExpressApp, options?: any): void {
    const expressApp = app.getApp();
    
    // Add logging middleware
    expressApp.use((req, res, next) => {
      console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
      next();
    });
  }
}
```

### 2. Plugin with Routes

```typescript
export class ApiPlugin implements SoapExpressPlugin {
  readonly name = 'api';
  readonly version = '1.0.0';

  install(app: SoapExpressApp, options?: any): void {
    const expressApp = app.getApp();
    
    // Add API routes
    expressApp.get('/api/status', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
  }
}
```

### 3. Plugin with Dependencies

```typescript
export class DatabasePlugin implements SoapExpressPlugin {
  readonly name = 'database';
  readonly version = '1.0.0';
  readonly dependencies = ['logger']; // Requires logger plugin

  install(app: SoapExpressApp, options?: any): void {
    // Database setup logic
  }
}
```

### 4. Plugin with Services

```typescript
export class CachePlugin implements SoapExpressPlugin {
  readonly name = 'cache';
  readonly version = '1.0.0';

  install(app: SoapExpressApp, options?: any): void {
    // Register cache service
    app.registerService('cache', new CacheService(options));
    
    // Add cache middleware
    const expressApp = app.getApp();
    expressApp.use(this.cacheMiddleware);
  }

  private cacheMiddleware = (req: any, res: any, next: any) => {
    // Cache logic
    next();
  };
}
```

## 🔄 Plugin Lifecycle

Plugins support the following lifecycle hooks:

### Installation Phase
- `install()` - Called when plugin is installed

### Runtime Phase
- `beforeStart()` - Called before server starts
- `afterStart()` - Called after server starts

### Cleanup Phase
- `beforeStop()` - Called before server stops
- `afterStop()` - Called after server stops
- `uninstall()` - Called when plugin is uninstalled

## 🎛️ Plugin Management

### Using Plugins

```typescript
import { SoapExpressApp, HealthCheckPlugin } from '@soapjs/soap-express';

const app = new SoapExpressApp();

// Install plugin
app.usePlugin(new HealthCheckPlugin());

// Install with options
app.usePlugin(new HealthCheckPlugin({
  path: '/health',
  timeout: 5000
}));
```

### Loading Plugins

```typescript
// Load plugin by name
await app.loadPlugin('health-check');

// Load plugins from directory
await app.loadPluginsFromDirectory('./plugins');
```

### Plugin Information

```typescript
// List all plugins
const plugins = app.listPlugins();

// Get specific plugin
const plugin = app.getPlugin('health-check');

// Check if plugin is loaded
const isLoaded = app.isPluginLoaded('health-check');

// Unload plugin
app.unloadPlugin('health-check');
```

## 📚 Examples

### Complete Example

```typescript
import { SoapExpressApp, HealthCheckPlugin } from '@soapjs/soap-express';

async function main() {
  const app = new SoapExpressApp();

  // Install health check plugin
  app.usePlugin(new HealthCheckPlugin({
    path: '/health',
    timeout: 5000
  }));

  // Add custom health checks
  const healthPlugin = app.getPlugin('health-check') as HealthCheckPlugin;
  healthPlugin.addHealthCheck({
    name: 'database',
    check: async () => {
      // Check database connection
      return {
        status: 'healthy',
        message: 'Database is connected',
        data: { connectionCount: 5 }
      };
    },
    critical: true
  });

  // Start server
  await app.start(3000);
  console.log('Server started with plugins!');
}

main().catch(console.error);
```

### Custom Plugin Example

```typescript
import { SoapExpressPlugin, SoapExpressApp } from '@soapjs/soap-express';

export class MetricsPlugin implements SoapExpressPlugin {
  readonly name = 'metrics';
  readonly version = '1.0.0';
  readonly description = 'Application metrics collection';

  private metrics: Map<string, number> = new Map();

  install(app: SoapExpressApp, options?: any): void {
    const expressApp = app.getApp();
    
    // Add metrics middleware
    expressApp.use((req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        this.recordMetric(`${req.method}:${req.path}`, duration);
      });
      
      next();
    });

    // Add metrics endpoint
    expressApp.get('/metrics', (req, res) => {
      res.json(Object.fromEntries(this.metrics));
    });
  }

  private recordMetric(key: string, value: number): void {
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + value);
  }
}
```

## 🚀 Best Practices

1. **Single Responsibility**: Each plugin should have one clear purpose
2. **Error Handling**: Always handle errors gracefully in plugin methods
3. **Configuration**: Use options parameter for plugin configuration
4. **Dependencies**: Declare dependencies clearly in plugin metadata
5. **Cleanup**: Implement uninstall method for proper cleanup
6. **Testing**: Write tests for your plugins
7. **Documentation**: Document your plugin's purpose and usage

## 🔧 Troubleshooting

### Common Issues

1. **Plugin not loading**: Check plugin name and version format
2. **Dependency errors**: Ensure all dependencies are installed first
3. **Route conflicts**: Use unique paths for plugin routes
4. **Memory leaks**: Implement proper cleanup in uninstall method

### Debug Mode

Enable debug logging to troubleshoot plugin issues:

```typescript
const app = new SoapExpressApp({
  // Enable debug mode
  debug: true
});
```

## 📦 Plugin Marketplace

The plugin system is designed to support a future plugin marketplace where users can:

- Discover plugins by category
- Install plugins with a single command
- Update plugins automatically
- Share custom plugins with the community

This will make SoapExpress even more extensible and community-driven!
