export interface ApiDocOptions {
  summary?: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  operationId?: string;
  externalDocs?: {
    description?: string;
    url: string;
  };
  responses?: Record<string, ApiResponse>;
  requestBody?: ApiRequestBody;
  parameters?: ApiParameter[];
  security?: ApiSecurity[];
  servers?: ApiServer[];
  callbacks?: Record<string, ApiCallback>;
  examples?: Record<string, any>;
}

export interface ApiResponse {
  description: string;
  content?: Record<string, ApiContent>;
  headers?: Record<string, ApiHeader>;
  links?: Record<string, ApiLink>;
  schema?: any;
}

export interface ApiContent {
  schema?: any;
  example?: any;
  examples?: Record<string, any>;
  encoding?: Record<string, any>;
}

export interface ApiHeader {
  description?: string;
  required?: boolean;
  schema?: any;
  example?: any;
}

export interface ApiLink {
  operationId?: string;
  parameters?: Record<string, any>;
  requestBody?: any;
  description?: string;
  server?: ApiServer;
}

export interface ApiRequestBody {
  description?: string;
  content: Record<string, ApiContent>;
  required?: boolean;
}

export interface ApiParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
  schema?: any;
  example?: any;
  examples?: Record<string, any>;
}

export interface ApiSecurity {
  name: string;
  scopes?: string[];
}

export interface ApiServer {
  url: string;
  description?: string;
  variables?: Record<string, ApiServerVariable>;
}

export interface ApiServerVariable {
  enum?: string[];
  default: string;
  description?: string;
}

export interface ApiCallback {
  [path: string]: {
    [method: string]: any;
  };
}

export interface ApiTag {
  name: string;
  description?: string;
  externalDocs?: {
    description?: string;
    url: string;
  };
}

export interface ApiInfo {
  title: string;
  description?: string;
  version: string;
  termsOfService?: string;
  contact?: {
    name?: string;
    url?: string;
    email?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
}

export interface DocumentationConfig {
  info: ApiInfo;
  servers?: ApiServer[];
  tags?: ApiTag[];
  security?: ApiSecurity[];
  externalDocs?: {
    description?: string;
    url: string;
  };
  basePath?: string;
  version?: string;
}

export interface DocumentationMetadata {
  info: ApiInfo;
  servers?: ApiServer[];
  tags?: ApiTag[];
  security?: ApiSecurity[];
  externalDocs?: {
    description?: string;
    url: string;
  };
  paths: Record<string, Record<string, ApiDocOptions>>;
  components?: {
    schemas?: Record<string, any>;
    responses?: Record<string, ApiResponse>;
    parameters?: Record<string, ApiParameter>;
    examples?: Record<string, any>;
    requestBodies?: Record<string, ApiRequestBody>;
    headers?: Record<string, ApiHeader>;
    securitySchemes?: Record<string, any>;
    links?: Record<string, ApiLink>;
    callbacks?: Record<string, ApiCallback>;
  };
}

export interface DocumentationGenerator {
  generate(metadata: DocumentationMetadata): string;
  getMimeType(): string;
  getFileExtension(): string;
}

export interface DocumentationMiddleware {
  serveDocs(path: string, generator: DocumentationGenerator): void;
  serveJson(path: string): void;
  serveYaml(path: string): void;
  serveHtml(path: string, generator: DocumentationGenerator): void;
}
