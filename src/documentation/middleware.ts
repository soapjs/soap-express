import { Request, Response, NextFunction } from 'express';
import { DocumentationGenerator, DocumentationMetadata, DocumentationMiddleware } from './types';
import { DocumentationGeneratorFactory } from './generator';
import { DocumentationCollector } from './collector';

/**
 * Middleware for serving API documentation
 */
export class DocumentationMiddlewareImpl implements DocumentationMiddleware {
  private collector: DocumentationCollector;
  private app: any;

  constructor(app: any, collector: DocumentationCollector) {
    this.app = app;
    this.collector = collector;
  }

  /**
   * Serve documentation using a specific generator
   * @param path - Endpoint path for serving documentation
   * @param generator - Documentation generator to use
   */
  serveDocs(path: string, generator: DocumentationGenerator): void {
    this.app.get(path, (req: Request, res: Response, next: NextFunction) => {
      try {
        const metadata = this.collector.collect();
        const content = generator.generate(metadata);
        
        res.setHeader('Content-Type', generator.getMimeType());
        res.send(content);
      } catch (error) {
        next(error);
      }
    });
  }

  /**
   * Serve documentation in JSON format
   * @param path - Endpoint path for serving JSON documentation
   */
  serveJson(path: string): void {
    const metadata = this.collector.collect();
    const generator = DocumentationGeneratorFactory.create('json', metadata);
    this.serveDocs(path, generator);
  }

  /**
   * Serve documentation in YAML format
   * @param path - Endpoint path for serving YAML documentation
   */
  serveYaml(path: string): void {
    const metadata = this.collector.collect();
    const generator = DocumentationGeneratorFactory.create('yaml', metadata);
    this.serveDocs(path, generator);
  }

  /**
   * Serve documentation in HTML format
   * @param path - Endpoint path for serving HTML documentation
   * @param generator - Optional custom HTML generator
   */
  serveHtml(path: string, generator?: DocumentationGenerator): void {
    const metadata = this.collector.collect();
    const htmlGenerator = generator || DocumentationGeneratorFactory.create('html', metadata);
    this.serveDocs(path, htmlGenerator);
  }

  /**
   * Serve interactive documentation (Swagger UI style)
   * @param path - Endpoint path for serving interactive documentation
   * @param options - Options for interactive documentation
   */
  serveInteractive(path: string, options: {
    title?: string;
    customCss?: string;
    customJs?: string;
    swaggerUrl?: string;
  } = {}): void {
    this.app.get(path, (req: Request, res: Response, next: NextFunction) => {
      try {
        const metadata = this.collector.collect();
        const jsonGenerator = DocumentationGeneratorFactory.create('json', metadata);
        const swaggerUrl = options.swaggerUrl || '/api-docs.json';
        
        const html = this.generateInteractiveHtml({
          title: options.title || metadata.info.title,
          swaggerUrl,
          customCss: options.customCss,
          customJs: options.customJs
        });
        
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        next(error);
      }
    });
  }

  /**
   * Serve documentation statistics
   * @param path - Endpoint path for serving statistics
   */
  serveStats(path: string): void {
    this.app.get(path, (req: Request, res: Response, next: NextFunction) => {
      try {
        const stats = this.collector.getStats();
        res.json({
          ...stats,
          timestamp: new Date().toISOString(),
          version: this.collector['config'].info.version
        });
      } catch (error) {
        next(error);
      }
    });
  }

  /**
   * Generate interactive HTML documentation
   */
  private generateInteractiveHtml(options: {
    title: string;
    swaggerUrl: string;
    customCss?: string;
    customJs?: string;
  }): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${options.title} - Interactive API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
    <style>
        .swagger-ui .topbar { display: none; }
        ${options.customCss || ''}
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: '${options.swaggerUrl}',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                tryItOutEnabled: true,
                requestInterceptor: function(request) {
                    // Add any custom request headers here
                    return request;
                },
                responseInterceptor: function(response) {
                    // Handle responses here
                    return response;
                }
            });
            
            window.ui = ui;
        };
        
        ${options.customJs || ''}
    </script>
</body>
</html>`;
  }
}

/**
 * Factory for creating documentation middleware
 */
export class DocumentationMiddlewareFactory {
  /**
   * Create documentation middleware with default configuration
   * @param app - Express app instance
   * @param config - Documentation configuration
   */
  static create(app: any, config: {
    info: {
      title: string;
      description?: string;
      version: string;
    };
    servers?: Array<{ url: string; description?: string }>;
    tags?: Array<{ name: string; description?: string }>;
    basePath?: string;
  }): DocumentationMiddlewareImpl {
    const collector = new DocumentationCollector(config);
    return new DocumentationMiddlewareImpl(app, collector);
  }

  /**
   * Create documentation middleware with custom collector
   * @param app - Express app instance
   * @param collector - Custom documentation collector
   */
  static createWithCollector(app: any, collector: DocumentationCollector): DocumentationMiddlewareImpl {
    return new DocumentationMiddlewareImpl(app, collector);
  }
}

/**
 * Convenience function to add documentation endpoints to an app
 * @param app - Express app instance
 * @param config - Documentation configuration
 * @param options - Additional options
 */
export function addDocumentationEndpoints(
  app: any,
  config: {
    info: {
      title: string;
      description?: string;
      version: string;
    };
    servers?: Array<{ url: string; description?: string }>;
    tags?: Array<{ name: string; description?: string }>;
    basePath?: string;
  },
  options: {
    jsonPath?: string;
    yamlPath?: string;
    htmlPath?: string;
    interactivePath?: string;
    statsPath?: string;
  } = {}
): DocumentationMiddlewareImpl {
  const middleware = DocumentationMiddlewareFactory.create(app, config);
  
  // Set default paths
  const paths = {
    jsonPath: '/api-docs.json',
    yamlPath: '/api-docs.yaml',
    htmlPath: '/api-docs.html',
    interactivePath: '/docs',
    statsPath: '/api-docs/stats',
    ...options
  };
  
  // Add all documentation endpoints
  middleware.serveJson(paths.jsonPath);
  middleware.serveYaml(paths.yamlPath);
  middleware.serveHtml(paths.htmlPath);
  middleware.serveInteractive(paths.interactivePath);
  middleware.serveStats(paths.statsPath);
  
  return middleware;
}
