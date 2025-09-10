import { SoapExpressPluginManager } from '../plugin-manager';
import { SoapExpressPlugin } from '../../types/plugin';
import { SoapExpressApp } from '../../app';

const mockPlugin: SoapExpressPlugin = {
  name: 'test-plugin',
  version: '1.0.0',
  install: jest.fn()
};

const mockApp = {
  registerController: jest.fn(),
  registerMiddleware: jest.fn(),
  use: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  listen: jest.fn(),
  getApp: jest.fn(),
  getRouter: jest.fn(),
  getPluginManager: jest.fn()
} as any;

describe('SoapExpressPluginManager - Minimal Tests', () => {
  let pluginManager: SoapExpressPluginManager;

  beforeEach(() => {
    jest.clearAllMocks();
    pluginManager = new SoapExpressPluginManager();
  });

  describe('constructor', () => {
    it('should initialize with empty plugins array', () => {
      expect(pluginManager.listPlugins()).toEqual([]);
    });
  });

  describe('listPlugins', () => {
    it('should return empty array initially', () => {
      expect(pluginManager.listPlugins()).toEqual([]);
    });
  });

  describe('getPlugin', () => {
    it('should return undefined for non-existent plugin', () => {
      expect(pluginManager.getPlugin('non-existent')).toBeUndefined();
    });
  });

  describe('isPluginLoaded', () => {
    it('should return false for non-loaded plugin', () => {
      expect(pluginManager.isPluginLoaded('non-existent')).toBe(false);
    });
  });

  describe('setApp', () => {
    it('should set app instance', () => {
      pluginManager.setApp(mockApp);

      const appInstance = (pluginManager as any).getAppInstance();
      expect(appInstance).toBe(mockApp);
    });
  });

  describe('getApp', () => {
    it('should return app instance', () => {
      pluginManager.setApp(mockApp);

      const appInstance = (pluginManager as any).getApp();
      expect(appInstance).toBe(mockApp);
    });
  });
});
