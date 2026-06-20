export type ExpressAuthRecipeOptions<TOptions extends Record<string, any> = Record<string, any>> =
  TOptions & Record<string, any>;

import type { OAuth2ExpressStorageConfig, OAuth2CookieStorageOptions } from './oauth2-storage';
import { createCookieOAuth2Storage } from './oauth2-storage';

export interface ExpressOAuth2RecipeOptions extends ExpressAuthRecipeOptions {
  express?: {
    oauth2?: {
      storage?: OAuth2ExpressStorageConfig | OAuth2CookieStorageOptions | true;
    };
  };
}

function recipes(): any {
  return require('@soapjs/soap-auth/recipes');
}

export function createExpressJwtAuth<TContext = unknown, TUser = unknown>(
  options: ExpressAuthRecipeOptions,
) {
  return recipes().createJwtAuthConfig(options) as unknown;
}

export function createExpressLocalAuth<TContext = unknown, TUser = unknown>(
  options: ExpressAuthRecipeOptions,
) {
  return recipes().createLocalAuthConfig(options) as unknown;
}

export function createExpressBasicAuth<TContext = unknown, TUser = unknown>(
  options: ExpressAuthRecipeOptions,
) {
  return recipes().createBasicAuthConfig(options) as unknown;
}

export function createExpressApiKeyAuth<TContext = unknown, TUser = unknown>(
  options: ExpressAuthRecipeOptions,
) {
  return recipes().createApiKeyAuthConfig(options) as unknown;
}

export function createExpressOAuth2Auth<TUser = unknown>(
  options: ExpressOAuth2RecipeOptions,
) {
  return recipes().createOAuth2ProviderConfig(withOAuth2Storage(options)) as unknown;
}

export function createExpressHybridOAuth2Auth<TUser = unknown>(
  options: ExpressOAuth2RecipeOptions,
) {
  return recipes().createHybridOAuth2ProviderConfig(withOAuth2Storage(options)) as unknown;
}

function isStorageConfig(value: unknown): value is OAuth2ExpressStorageConfig {
  return !!value && typeof value === 'object' && 'state' in value && 'nonce' in value && 'pkce' in value;
}

function withOAuth2Storage(options: ExpressOAuth2RecipeOptions): Record<string, any> {
  const { express, ...rest } = options;
  const storageOption = express?.oauth2?.storage;
  if (!storageOption) return rest;

  const storage = isStorageConfig(storageOption)
    ? storageOption
    : createCookieOAuth2Storage(storageOption === true ? undefined : storageOption);

  return {
    ...rest,
    state: (rest as any).state ?? storage.state,
    nonce: (rest as any).nonce ?? storage.nonce,
    pkce: (rest as any).pkce ?? storage.pkce,
  };
}
