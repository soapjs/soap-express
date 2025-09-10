import { Request, Response, NextFunction } from 'express';
import { SoapExpressApp } from '../app';
import { RouteMetadata, MiddlewareMetadata } from './index';

// Plugin lifecycle hooks
export interface PluginLifecycle {
  install(app: SoapExpressApp, options?: any): void;
  uninstall?(app: SoapExpressApp): void;
  beforeStart?(app: SoapExpressApp): void;
  afterStart?(app: SoapExpressApp): void;
  beforeStop?(app: SoapExpressApp): void;
  afterStop?(app: SoapExpressApp): void;
}

// Plugin metadata
export interface PluginMetadata {
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies?: string[];
  peerDependencies?: string[];
  tags?: string[];
  category?: string;
}

// Service metadata for plugins
export interface ServiceMetadata {
  name: string;
  service: any;
  singleton?: boolean;
  dependencies?: string[];
}

// Plugin interface
export interface SoapExpressPlugin extends PluginLifecycle, PluginMetadata {
  // Plugin identification
  readonly name: string;
  readonly version: string;
  
  // Plugin capabilities
  middleware?: MiddlewareMetadata[];
  routes?: RouteMetadata[];
  services?: ServiceMetadata[];
  
  // Plugin configuration
  config?: any;
  
  // Plugin state
  installed?: boolean;
  enabled?: boolean;
}

// Plugin registry interface
export interface PluginRegistry {
  register(plugin: SoapExpressPlugin): void;
  unregister(pluginName: string): void;
  get(pluginName: string): SoapExpressPlugin | undefined;
  list(): SoapExpressPlugin[];
  install(app: SoapExpressApp, pluginName: string, options?: any): void;
  uninstall(app: SoapExpressApp, pluginName: string): void;
  isInstalled(pluginName: string): boolean;
  getInstalled(): SoapExpressPlugin[];
}

// Plugin manager interface
export interface PluginManager {
  usePlugin(plugin: SoapExpressPlugin, options?: any): SoapExpressApp;
  loadPlugin(pluginName: string, options?: any): Promise<SoapExpressApp>;
  unloadPlugin(pluginName: string): SoapExpressApp;
  listPlugins(): SoapExpressPlugin[];
  getPlugin(pluginName: string): SoapExpressPlugin | undefined;
  isPluginLoaded(pluginName: string): boolean;
  loadPluginsFromDirectory(dir: string): Promise<SoapExpressApp>;
}

// Plugin discovery interface
export interface PluginDiscovery {
  discover(directory: string): Promise<SoapExpressPlugin[]>;
  load(pluginPath: string): Promise<SoapExpressPlugin>;
  validate(plugin: SoapExpressPlugin): boolean;
}

// Plugin configuration
export interface PluginConfig {
  autoLoad?: boolean;
  pluginDirectory?: string;
  enabledPlugins?: string[];
  disabledPlugins?: string[];
  pluginOptions?: Record<string, any>;
}

// Health check plugin specific types
export interface HealthCheckOptions {
  path?: string;
  checks?: HealthCheck[];
  timeout?: number;
  responseFormat?: 'json' | 'text';
}

export interface HealthCheck {
  name: string;
  check: () => Promise<HealthCheckResult> | HealthCheckResult;
  timeout?: number;
  critical?: boolean;
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  data?: any;
  timestamp?: string;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error' | 'degraded';
  timestamp: string;
  uptime: number;
  checks: Record<string, HealthCheckResult>;
  version?: string;
  environment?: string;
}
