import * as Soap from "@soapjs/soap";

export interface ApiKeyValidator {
  validate: <T = boolean>(
    key: string,
    ...args: any[]
  ) => Promise<Soap.Result<T>>;
}

export interface BasicValidator {
  validate: <T = boolean>(
    user: string,
    password: string,
    ...args: any[]
  ) => Promise<Soap.Result<T>>;
}

export interface TokenValidator {
  validate: <T = boolean>(
    token: string,
    ...args: any[]
  ) => Promise<Soap.Result<T>>;
}

export interface JwtValidator {
  validate: <T = boolean>(
    payload: object,
    ...args: any[]
  ) => Promise<Soap.Result<T>>;
}

export interface GoogleValidator {
  validate: <T = boolean>(
    accessToken: string,
    refreshToken: string,
    profile: { id: string; [key: string]: any },
    ...args: any[]
  ) => Promise<Soap.Result<T>>;
}

export interface FacebookValidator {
  validate: <T = boolean>(
    accessToken: string,
    refreshToken: string,
    profile: { id: string; [key: string]: any },
    ...args: any[]
  ) => Promise<Soap.Result<T>>;
}

export type AuthValidators = {
  apiKey?: ApiKeyValidator;
  basic?: BasicValidator;
  token?: TokenValidator;
  jwt?: JwtValidator;
  google?: GoogleValidator;
  facebook?: FacebookValidator;
};
