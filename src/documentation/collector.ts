import { DecoratorRegistry } from '../decorators/registry';
import { DocumentationMetadata, ApiDocOptions, ApiInfo, ApiServer, ApiTag } from './types';

/**
 * Collects API documentation metadata from registered controllers and routes
 */
export class DocumentationCollector {
  private config: {
    info: ApiInfo;
    servers?: ApiServer[];
    tags?: ApiTag[];
    basePath?: string;
  };

  constructor(config: {
    info: ApiInfo;
    servers?: ApiServer[];
    tags?: ApiTag[];
    basePath?: string;
  }) {
    this.config = config;
  }

  /**
   * Collect all documentation metadata from registered routes and controllers
   */
  collect(): DocumentationMetadata {
    const routes = DecoratorRegistry.getRoutes();
    const controllers = DecoratorRegistry.getControllers();
    
    const paths: Record<string, Record<string, ApiDocOptions>> = {};
    const allTags = new Set<string>();
    const allSecuritySchemes = new Set<string>();

    // Process each route
    routes.forEach((routeMetadata, routeKey) => {
      const [controllerName, methodName] = routeKey.split('.');
      const controllerMetadata = controllers.get(controllerName);
      
      if (!controllerMetadata) {
        console.warn(`Controller metadata not found for ${controllerName}`);
        return;
      }

      // Build full path
      const fullPath = this.buildFullPath(controllerMetadata.basePath, routeMetadata.path);
      
      // Get API documentation from route options
      const apiDoc = routeMetadata.options?.apiDoc;
      if (!apiDoc) {
        return; // Skip routes without API documentation
      }

      // Initialize path if it doesn't exist
      if (!paths[fullPath]) {
        paths[fullPath] = {};
      }

      // Add method to path
      const apiDocTyped = apiDoc as any;
      paths[fullPath][routeMetadata.method.toLowerCase()] = {
        ...apiDocTyped,
        // Merge with controller-level documentation
        ...this.mergeControllerDoc(controllerMetadata, apiDocTyped)
      };

      // Collect tags
      if (apiDocTyped.tags) {
        apiDocTyped.tags.forEach((tag: string) => allTags.add(tag));
      }

      // Collect security schemes
      if (apiDocTyped.security) {
        apiDocTyped.security.forEach((sec: any) => allSecuritySchemes.add(sec.name));
      }
    });

    // Build final metadata
    const metadata: DocumentationMetadata = {
      info: this.config.info,
      servers: this.config.servers,
      tags: this.buildTags(allTags),
      paths,
      components: {
        schemas: {},
        responses: {},
        parameters: {},
        examples: {},
        requestBodies: {},
        headers: {},
        securitySchemes: this.buildSecuritySchemes(allSecuritySchemes),
        links: {},
        callbacks: {}
      }
    };

    return metadata;
  }

  /**
   * Build full path from controller base path and route path
   */
  private buildFullPath(controllerBasePath: string, routePath: string): string {
    const basePath = this.config.basePath || '';
    const controllerPath = controllerBasePath || '';
    const route = routePath || '';
    
    // Ensure paths start with / and don't have double slashes
    const fullPath = [basePath, controllerPath, route]
      .filter(Boolean)
      .join('/')
      .replace(/\/+/g, '/')
      .replace(/\/$/, '') || '/';
    
    return fullPath;
  }

  /**
   * Merge controller-level documentation with route-level documentation
   */
  private mergeControllerDoc(controllerMetadata: any, routeApiDoc: ApiDocOptions): ApiDocOptions {
    const controllerDoc = controllerMetadata.options?.apiDoc;
    if (!controllerDoc) {
      return routeApiDoc;
    }

    return {
      ...routeApiDoc,
      // Merge tags (route tags take precedence)
      tags: routeApiDoc.tags || controllerDoc.tags,
      // Merge external docs (route external docs take precedence)
      externalDocs: routeApiDoc.externalDocs || controllerDoc.externalDocs
    };
  }

  /**
   * Build tags array from collected tags
   */
  private buildTags(tags: Set<string>): ApiTag[] {
    return Array.from(tags).map(tag => ({
      name: tag,
      description: this.getTagDescription(tag)
    }));
  }

  /**
   * Get description for a tag (can be overridden for custom descriptions)
   */
  private getTagDescription(tag: string): string {
    // Default tag descriptions - can be customized
    const descriptions: Record<string, string> = {
      'users': 'User management operations',
      'auth': 'Authentication and authorization',
      'admin': 'Administrative operations',
      'public': 'Publicly accessible endpoints',
      'internal': 'Internal API endpoints'
    };
    
    return descriptions[tag] || `Operations related to ${tag}`;
  }

  /**
   * Build security schemes from collected schemes
   */
  private buildSecuritySchemes(schemes: Set<string>): Record<string, any> {
    const securitySchemes: Record<string, any> = {};
    
    schemes.forEach(scheme => {
      // Default security scheme definitions - can be customized
      switch (scheme.toLowerCase()) {
        case 'bearer':
          securitySchemes[scheme] = {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          };
          break;
        case 'basic':
          securitySchemes[scheme] = {
            type: 'http',
            scheme: 'basic'
          };
          break;
        case 'apikey':
          securitySchemes[scheme] = {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key'
          };
          break;
        case 'oauth2':
          securitySchemes[scheme] = {
            type: 'oauth2',
            flows: {
              authorizationCode: {
                authorizationUrl: 'https://example.com/oauth/authorize',
                tokenUrl: 'https://example.com/oauth/token',
                scopes: {}
              }
            }
          };
          break;
        default:
          securitySchemes[scheme] = {
            type: 'http',
            scheme: scheme
          };
      }
    });
    
    return securitySchemes;
  }

  /**
   * Get statistics about collected documentation
   */
  getStats(): {
    totalEndpoints: number;
    totalPaths: number;
    totalTags: number;
    totalSecuritySchemes: number;
    endpointsByMethod: Record<string, number>;
  } {
    const routes = DecoratorRegistry.getRoutes();
    const paths: Record<string, Record<string, ApiDocOptions>> = {};
    const allTags = new Set<string>();
    const allSecuritySchemes = new Set<string>();
    const endpointsByMethod: Record<string, number> = {};

    routes.forEach((routeMetadata, routeKey) => {
      const [controllerName, methodName] = routeKey.split('.');
      const controllerMetadata = DecoratorRegistry.getControllers().get(controllerName);
      
      if (!controllerMetadata) return;

      const apiDoc = routeMetadata.options?.apiDoc;
      if (!apiDoc) return;

      const fullPath = this.buildFullPath(controllerMetadata.basePath, routeMetadata.path);
      
      if (!paths[fullPath]) {
        paths[fullPath] = {};
      }
      
      paths[fullPath][routeMetadata.method.toLowerCase()] = apiDoc;
      
      // Count by method
      const method = routeMetadata.method.toLowerCase();
      endpointsByMethod[method] = (endpointsByMethod[method] || 0) + 1;
      
      // Collect tags and security schemes
      const apiDocTyped = apiDoc as any;
      if (apiDocTyped.tags) {
        apiDocTyped.tags.forEach((tag: string) => allTags.add(tag));
      }
      if (apiDocTyped.security) {
        apiDocTyped.security.forEach((sec: any) => allSecuritySchemes.add(sec.name));
      }
    });

    return {
      totalEndpoints: routes.size,
      totalPaths: Object.keys(paths).length,
      totalTags: allTags.size,
      totalSecuritySchemes: allSecuritySchemes.size,
      endpointsByMethod
    };
  }
}
