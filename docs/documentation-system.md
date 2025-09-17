# 📚 Documentation System

The `@soapjs/soap-express` framework includes a comprehensive documentation system that automatically generates API documentation from your decorators and code. This system is designed to be flexible, extensible, and easy to use, and is built on top of the `@soapjs/soap` framework's HTTP application architecture.

## Features

- 🎯 **Decorator-based**: Use simple decorators to document your API
- 🔄 **Automatic generation**: Documentation is generated automatically from your code
- 📊 **Multiple formats**: Support for JSON, YAML, HTML, and interactive documentation
- 🎨 **Customizable**: Easy to customize and extend
- 🔌 **Plugin-ready**: Works with any documentation generator
- 📱 **Interactive UI**: Built-in Swagger UI integration
- 📈 **Statistics**: Track documentation coverage and usage

## Quick Start

### 1. Basic Setup

```typescript
import { SoapExpressApp, Controller, Get } from '@soapjs/soap-express';
import { ApiDoc, ApiResponse, ApiTags, addDocumentationEndpoints } from '@soapjs/soap-express';

@Controller('/api/users')
class UserController {
  @Get('/')
  @ApiDoc({
    summary: 'Get all users',
    description: 'Retrieves a list of all users',
    tags: ['users']
  })
  @ApiResponse('200', {
    description: 'List of users retrieved successfully',
    schema: {
      type: 'array',
      items: { type: 'object' }
    }
  })
  @ApiTags('users')
  async getUsers(req: any, res: any) {
    res.json([]);
  }
}

const app = new SoapExpressApp({});
app.registerController(UserController);

// Add documentation endpoints
addDocumentationEndpoints(app.getApp(), {
  info: {
    title: 'My API',
    description: 'A sample API',
    version: '1.0.0'
  }
});

await app.start(3000);
```

### 2. Access Documentation

Once your server is running, you can access documentation at:

- **Interactive UI**: `http://localhost:3000/docs`
- **JSON format**: `http://localhost:3000/api-docs.json`
- **YAML format**: `http://localhost:3000/api-docs.yaml`
- **HTML format**: `http://localhost:3000/api-docs.html`
- **Statistics**: `http://localhost:3000/api-docs/stats`

## Decorators

### @ApiDoc

The main decorator for API documentation:

```typescript
@ApiDoc({
  summary: 'Get user by ID',
  description: 'Retrieves a specific user by their unique identifier',
  tags: ['users'],
  deprecated: false,
  operationId: 'getUserById',
  externalDocs: {
    description: 'Find out more',
    url: 'https://docs.example.com'
  },
  responses: {
    '200': {
      description: 'User found',
      content: {
        'application/json': {
          schema: { type: 'object' }
        }
      }
    }
  },
  parameters: [
    {
      name: 'id',
      in: 'path',
      description: 'User ID',
      required: true,
      schema: { type: 'number' }
    }
  ],
  security: [{ name: 'bearer' }],
  examples: {
    'success': { id: 1, name: 'John Doe' }
  }
})
@Get('/:id')
async getUserById(req: any, res: any) { }
```

### @ApiResponse

Document API responses:

```typescript
@ApiResponse('200', {
  description: 'User found successfully',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          name: { type: 'string' },
          email: { type: 'string' }
        }
      }
    }
  }
})
@ApiResponse('404', {
  description: 'User not found'
})
@Get('/:id')
async getUserById(req: any, res: any) { }
```

### @ApiParameter

Document API parameters:

```typescript
@ApiParameter({
  name: 'id',
  in: 'path',
  description: 'User ID',
  required: true,
  schema: { type: 'number' }
})
@ApiParameter({
  name: 'include',
  in: 'query',
  description: 'Include related data',
  required: false,
  schema: { type: 'string' }
})
@Get('/:id')
async getUserById(req: any, res: any) { }
```

### @ApiTags

Add tags to endpoints:

```typescript
@ApiTags('users', 'public', 'v1')
@Get('/')
async getUsers(req: any, res: any) { }
```

### @ApiSummary & @ApiDescription

Add summary and description:

```typescript
@ApiSummary('Get all users')
@ApiDescription('Retrieves a list of all users in the system with pagination support')
@Get('/')
async getUsers(req: any, res: any) { }
```

### @ApiDeprecated

Mark endpoints as deprecated:

```typescript
@ApiDeprecated()
@Get('/old-endpoint')
async oldEndpoint(req: any, res: any) { }
```

### @ApiOperationId

Set a unique operation ID:

```typescript
@ApiOperationId('getUserById')
@Get('/:id')
async getUserById(req: any, res: any) { }
```

### @ApiExamples

Add examples to endpoints:

```typescript
@ApiExamples({
  'success': { id: 1, name: 'John Doe', email: 'john@example.com' },
  'error': { error: 'User not found', code: 404 }
})
@Get('/:id')
async getUserById(req: any, res: any) { }
```

### @ApiController

Document entire controllers:

```typescript
@Controller('/api/users')
@ApiController({
  tags: ['users'],
  description: 'User management operations',
  externalDocs: {
    description: 'Find out more about our API',
    url: 'https://docs.example.com'
  }
})
class UserController { }
```

## Configuration

### Basic Configuration

```typescript
addDocumentationEndpoints(app.getApp(), {
  info: {
    title: 'My API',
    description: 'A comprehensive API for managing resources',
    version: '1.0.0',
    termsOfService: 'https://example.com/terms',
    contact: {
      name: 'API Support',
      url: 'https://example.com/support',
      email: 'support@example.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server'
    },
    {
      url: 'https://api.example.com',
      description: 'Production server'
    }
  ],
  tags: [
    {
      name: 'users',
      description: 'User management operations'
    },
    {
      name: 'admin',
      description: 'Administrative operations'
    }
  ],
  basePath: '/api'
});
```

### Custom Endpoint Paths

```typescript
addDocumentationEndpoints(app.getApp(), config, {
  jsonPath: '/api-docs.json',
  yamlPath: '/api-docs.yaml',
  htmlPath: '/api-docs.html',
  interactivePath: '/docs',
  statsPath: '/api-docs/stats'
});
```

## Custom Generators

### Creating a Custom Generator

```typescript
import { BaseDocumentationGenerator, DocumentationMetadata } from '@soapjs/soap-express';

class CustomGenerator extends BaseDocumentationGenerator {
  generate(metadata: DocumentationMetadata): string {
    // Your custom generation logic
    return this.convertToCustomFormat(metadata);
  }

  getMimeType(): string {
    return 'application/x-custom';
  }

  getFileExtension(): string {
    return 'custom';
  }

  private convertToCustomFormat(metadata: DocumentationMetadata): string {
    // Implementation here
    return '';
  }
}

// Use custom generator
const middleware = DocumentationMiddlewareFactory.create(app, config);
const customGenerator = new CustomGenerator(metadata);
middleware.serveDocs('/custom-docs', customGenerator);
```

### Using Different Generators

```typescript
import { 
  DocumentationGeneratorFactory, 
  DocumentationCollector 
} from '@soapjs/soap-express';

const collector = new DocumentationCollector(config);
const metadata = collector.collect();

// JSON generator
const jsonGenerator = DocumentationGeneratorFactory.create('json', metadata);
const jsonDocs = jsonGenerator.generate(metadata);

// YAML generator
const yamlGenerator = DocumentationGeneratorFactory.create('yaml', metadata);
const yamlDocs = yamlGenerator.generate(metadata);

// HTML generator
const htmlGenerator = DocumentationGeneratorFactory.create('html', metadata);
const htmlDocs = htmlGenerator.generate(metadata);
```

## Advanced Usage

### Manual Documentation Collection

```typescript
import { DocumentationCollector } from '@soapjs/soap-express';

const collector = new DocumentationCollector({
  info: {
    title: 'My API',
    version: '1.0.0'
  }
});

// Collect documentation metadata
const metadata = collector.collect();

// Get statistics
const stats = collector.getStats();
console.log('Total endpoints:', stats.totalEndpoints);
console.log('Total paths:', stats.totalPaths);
console.log('Endpoints by method:', stats.endpointsByMethod);
```

### Custom Middleware

```typescript
import { DocumentationMiddlewareFactory } from '@soapjs/soap-express';

const middleware = DocumentationMiddlewareFactory.create(app, config);

// Serve different formats
middleware.serveJson('/api-docs.json');
middleware.serveYaml('/api-docs.yaml');
middleware.serveHtml('/api-docs.html');

// Serve interactive documentation
middleware.serveInteractive('/docs', {
  title: 'My API Documentation',
  customCss: '.swagger-ui { font-family: Arial; }',
  customJs: 'console.log("Custom JS loaded");'
});

// Serve statistics
middleware.serveStats('/api-docs/stats');
```

### Custom HTML Generator

```typescript
import { HtmlDocumentationGenerator } from '@soapjs/soap-express';

class CustomHtmlGenerator extends HtmlDocumentationGenerator {
  protected generateEndpointsHtml(metadata: DocumentationMetadata): string {
    // Custom HTML generation
    return super.generateEndpointsHtml(metadata);
  }
}

const customGenerator = new CustomHtmlGenerator(metadata);
middleware.serveDocs('/custom-docs', customGenerator);
```

## Best Practices

### 1. Consistent Documentation

```typescript
// ✅ Good: Consistent and comprehensive
@ApiDoc({
  summary: 'Get user by ID',
  description: 'Retrieves a specific user by their unique identifier',
  tags: ['users'],
  parameters: [
    {
      name: 'id',
      in: 'path',
      description: 'User ID',
      required: true,
      schema: { type: 'number' }
    }
  ],
  responses: {
    '200': {
      description: 'User found successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              email: { type: 'string' }
            }
          }
        }
      }
    },
    '404': {
      description: 'User not found'
    }
  }
})
@Get('/:id')
async getUserById(req: any, res: any) { }

// ❌ Bad: Incomplete documentation
@Get('/:id')
async getUserById(req: any, res: any) { }
```

### 2. Use Tags Effectively

```typescript
// ✅ Good: Meaningful tags
@ApiTags('users', 'public', 'v1')
@Get('/')
async getUsers(req: any, res: any) { }

@ApiTags('users', 'admin', 'v1')
@Post('/')
async createUser(req: any, res: any) { }

// ❌ Bad: Unclear or no tags
@Get('/')
async getUsers(req: any, res: any) { }
```

### 3. Document All Responses

```typescript
// ✅ Good: Document all possible responses
@ApiResponse('200', { description: 'Success' })
@ApiResponse('400', { description: 'Bad Request' })
@ApiResponse('401', { description: 'Unauthorized' })
@ApiResponse('404', { description: 'Not Found' })
@ApiResponse('500', { description: 'Internal Server Error' })
@Get('/:id')
async getUserById(req: any, res: any) { }
```

### 4. Use Examples

```typescript
// ✅ Good: Provide examples
@ApiExamples({
  'success': {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    role: 'user'
  },
  'error': {
    error: 'User not found',
    code: 404,
    message: 'The requested user does not exist'
  }
})
@Get('/:id')
async getUserById(req: any, res: any) { }
```

### 5. Controller-Level Documentation

```typescript
// ✅ Good: Document the entire controller
@Controller('/api/users')
@ApiController({
  tags: ['users'],
  description: 'User management operations',
  externalDocs: {
    description: 'Find out more about our API',
    url: 'https://docs.example.com'
  }
})
class UserController {
  // All methods inherit controller documentation
}
```

## Integration with Other Tools

### OpenAPI/Swagger Integration

The generated documentation is compatible with OpenAPI 3.0 specification, so you can:

1. **Import into Swagger Editor**: Copy the JSON output and paste it into Swagger Editor
2. **Generate client SDKs**: Use tools like `swagger-codegen` or `openapi-generator`
3. **API testing**: Use tools like Postman or Insomnia that support OpenAPI import
4. **Mock servers**: Use tools like Prism or WireMock

### CI/CD Integration

```yaml
# Example GitHub Actions workflow
name: Generate API Documentation
on:
  push:
    branches: [main]
jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Generate documentation
        run: |
          npm run build
          node -e "
            const { createApp } = require('./build/examples/documentation-example');
            createApp().then(app => {
              const collector = app.getDocumentationCollector();
              const metadata = collector.collect();
              const fs = require('fs');
              fs.writeFileSync('api-docs.json', JSON.stringify(metadata, null, 2));
            });
          "
      - name: Upload documentation
        uses: actions/upload-artifact@v2
        with:
          name: api-docs
          path: api-docs.json
```

## Troubleshooting

### Common Issues

1. **Documentation not appearing**: Make sure you're using the decorators correctly and the routes are registered
2. **Missing metadata**: Ensure you're using `@ApiDoc` or other documentation decorators
3. **Format errors**: Check that your schema definitions are valid
4. **Performance issues**: For large APIs, consider using pagination in the documentation

### Debug Mode

```typescript
// Enable debug logging
const collector = new DocumentationCollector(config);
const metadata = collector.collect();

// Check what was collected
console.log('Collected metadata:', JSON.stringify(metadata, null, 2));

// Get statistics
const stats = collector.getStats();
console.log('Documentation stats:', stats);
```

## Examples

See the `examples/documentation-example.ts` file for a complete working example of the documentation system.

## License

MIT
