import { DocumentationGenerator, DocumentationMetadata } from './types';

/**
 * Abstract base class for documentation generators
 * Provides common functionality for all generators
 */
export abstract class BaseDocumentationGenerator implements DocumentationGenerator {
  protected metadata: DocumentationMetadata;

  constructor(metadata: DocumentationMetadata) {
    this.metadata = metadata;
  }

  /**
   * Generate documentation in the specific format
   * Must be implemented by subclasses
   */
  abstract generate(metadata: DocumentationMetadata): string;

  /**
   * Get MIME type for the generated content
   * Must be implemented by subclasses
   */
  abstract getMimeType(): string;

  /**
   * Get file extension for the generated content
   * Must be implemented by subclasses
   */
  abstract getFileExtension(): string;

  /**
   * Validate metadata before generation
   * Can be overridden by subclasses for format-specific validation
   */
  protected validateMetadata(metadata: DocumentationMetadata): void {
    if (!metadata.info) {
      throw new Error('Documentation metadata must include info section');
    }
    
    if (!metadata.info.title) {
      throw new Error('Documentation info must include title');
    }
    
    if (!metadata.info.version) {
      throw new Error('Documentation info must include version');
    }
    
    if (!metadata.paths || Object.keys(metadata.paths).length === 0) {
      console.warn('No API paths found in documentation metadata');
    }
  }

  /**
   * Get all unique tags from all endpoints
   */
  protected extractTags(metadata: DocumentationMetadata): string[] {
    const tags = new Set<string>();
    
    Object.values(metadata.paths).forEach(pathMethods => {
      Object.values(pathMethods).forEach(endpoint => {
        if (endpoint.tags) {
          endpoint.tags.forEach(tag => tags.add(tag));
        }
      });
    });
    
    return Array.from(tags);
  }

  /**
   * Get all unique security schemes from all endpoints
   */
  protected extractSecuritySchemes(metadata: DocumentationMetadata): string[] {
    const schemes = new Set<string>();
    
    Object.values(metadata.paths).forEach(pathMethods => {
      Object.values(pathMethods).forEach(endpoint => {
        if (endpoint.security) {
          endpoint.security.forEach(sec => schemes.add(sec.name));
        }
      });
    });
    
    return Array.from(schemes);
  }
}

/**
 * JSON documentation generator
 * Generates documentation in JSON format
 */
export class JsonDocumentationGenerator extends BaseDocumentationGenerator {
  generate(metadata: DocumentationMetadata): string {
    this.validateMetadata(metadata);
    return JSON.stringify(metadata, null, 2);
  }

  getMimeType(): string {
    return 'application/json';
  }

  getFileExtension(): string {
    return 'json';
  }
}

/**
 * YAML documentation generator
 * Generates documentation in YAML format
 * Note: This is a placeholder - actual YAML generation would require a YAML library
 */
export class YamlDocumentationGenerator extends BaseDocumentationGenerator {
  generate(metadata: DocumentationMetadata): string {
    this.validateMetadata(metadata);
    
    // This is a simplified YAML generator
    // In a real implementation, you would use a YAML library like js-yaml
    return this.convertToYaml(metadata);
  }

  private convertToYaml(obj: any, indent: number = 0): string {
    const spaces = '  '.repeat(indent);
    let yaml = '';
    
    if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
      Object.entries(obj).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          yaml += `${spaces}${key}:\n${this.convertToYaml(value, indent + 1)}`;
        } else if (Array.isArray(value)) {
          yaml += `${spaces}${key}:\n`;
          value.forEach(item => {
            yaml += `${spaces}  - ${this.convertToYaml(item, indent + 2)}`;
          });
        } else {
          yaml += `${spaces}${key}: ${this.convertValue(value)}\n`;
        }
      });
    } else {
      yaml += this.convertValue(obj);
    }
    
    return yaml;
  }

  private convertValue(value: any): string {
    if (typeof value === 'string') {
      return `"${value}"`;
    }
    return String(value);
  }

  getMimeType(): string {
    return 'application/x-yaml';
  }

  getFileExtension(): string {
    return 'yaml';
  }
}

/**
 * HTML documentation generator
 * Generates basic HTML documentation
 */
export class HtmlDocumentationGenerator extends BaseDocumentationGenerator {
  generate(metadata: DocumentationMetadata): string {
    this.validateMetadata(metadata);
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${metadata.info.title} - API Documentation</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .endpoint { border: 1px solid #ddd; margin: 20px 0; padding: 20px; border-radius: 5px; }
        .method { display: inline-block; padding: 5px 10px; border-radius: 3px; color: white; font-weight: bold; }
        .get { background-color: #61affe; }
        .post { background-color: #49cc90; }
        .put { background-color: #fca130; }
        .delete { background-color: #f93e3e; }
        .patch { background-color: #50e3c2; }
        .path { font-family: monospace; font-size: 18px; margin-left: 10px; }
        .description { margin: 10px 0; color: #666; }
        .tags { margin: 10px 0; }
        .tag { display: inline-block; background-color: #f0f0f0; padding: 3px 8px; margin: 2px; border-radius: 3px; font-size: 12px; }
        .responses { margin: 15px 0; }
        .response { margin: 5px 0; padding: 5px; background-color: #f9f9f9; border-left: 3px solid #ddd; }
        .parameters { margin: 15px 0; }
        .parameter { margin: 5px 0; padding: 5px; background-color: #f9f9f9; }
    </style>
</head>
<body>
    <h1>${metadata.info.title}</h1>
    <p>${metadata.info.description || ''}</p>
    <p><strong>Version:</strong> ${metadata.info.version}</p>
    
    ${this.generateEndpointsHtml(metadata)}
</body>
</html>`;
    
    return html;
  }

  private generateEndpointsHtml(metadata: DocumentationMetadata): string {
    let html = '<h2>Endpoints</h2>';
    
    Object.entries(metadata.paths).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([method, endpoint]) => {
        html += `
        <div class="endpoint">
            <div>
                <span class="method ${method.toLowerCase()}">${method.toUpperCase()}</span>
                <span class="path">${path}</span>
            </div>
            ${endpoint.summary ? `<h3>${endpoint.summary}</h3>` : ''}
            ${endpoint.description ? `<div class="description">${endpoint.description}</div>` : ''}
            ${endpoint.tags ? `<div class="tags">${endpoint.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>` : ''}
            ${endpoint.parameters ? this.generateParametersHtml(endpoint.parameters) : ''}
            ${endpoint.responses ? this.generateResponsesHtml(endpoint.responses) : ''}
        </div>`;
      });
    });
    
    return html;
  }

  private generateParametersHtml(parameters: any[]): string {
    let html = '<div class="parameters"><h4>Parameters</h4>';
    parameters.forEach(param => {
      html += `
      <div class="parameter">
          <strong>${param.name}</strong> (${param.in}) ${param.required ? '<span style="color: red;">*</span>' : ''}
          ${param.description ? `<br>${param.description}` : ''}
      </div>`;
    });
    html += '</div>';
    return html;
  }

  private generateResponsesHtml(responses: Record<string, any>): string {
    let html = '<div class="responses"><h4>Responses</h4>';
    Object.entries(responses).forEach(([code, response]) => {
      html += `
      <div class="response">
          <strong>${code}</strong> - ${response.description || ''}
      </div>`;
    });
    html += '</div>';
    return html;
  }

  getMimeType(): string {
    return 'text/html';
  }

  getFileExtension(): string {
    return 'html';
  }
}

/**
 * Factory for creating documentation generators
 */
export class DocumentationGeneratorFactory {
  static create(type: 'json' | 'yaml' | 'html', metadata: DocumentationMetadata): DocumentationGenerator {
    switch (type) {
      case 'json':
        return new JsonDocumentationGenerator(metadata);
      case 'yaml':
        return new YamlDocumentationGenerator(metadata);
      case 'html':
        return new HtmlDocumentationGenerator(metadata);
      default:
        throw new Error(`Unsupported documentation generator type: ${type}`);
    }
  }
}
