import * as Soap from "@soapjs/soap";
import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { BasicStrategy } from "passport-http";
import { OAuth2Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import passportCustom from "passport-custom";
import { AuthTypes } from "./enums";
import { setupApiKeyStrategy } from "./api-key.strategy";
import { AuthValidators } from "./types";

const CustomStrategy = passportCustom.Strategy;

export class SoapAuthManager {
  private initializedStrategies: Set<string> = new Set();

  constructor(protected validators?: AuthValidators) {
    passport.initialize();
  }

  public initializeAuthStrategy(authOptions: Soap.AuthOptions) {
    if (this.initializedStrategies.has(authOptions.type)) {
      return;
    }

    switch (authOptions.type) {
      case AuthTypes.JWT:
        this.setupJwtStrategy(authOptions);
        break;
      case AuthTypes.Basic:
        this.setupBasicStrategy(authOptions);
        break;
      case AuthTypes.OAuthGoogle:
        this.setupGoogleStrategy(authOptions);
        break;
      case AuthTypes.OAuthFacebook:
        this.setupFacebookStrategy(authOptions);
        break;
      case AuthTypes.ApiKey:
        this.setupApiKeyStrategy(authOptions);
        break;
      default:
        throw new Error(`Unsupported authentication type: ${authOptions.type}`);
    }

    this.initializedStrategies.add(authOptions.type);
    console.log(`Authentication strategy ${authOptions.type} initialized.`);
  }

  private setupJwtStrategy(options: Soap.AuthOptions) {
    const jwtOptions: any = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: options.secretOrKey,
      algorithms: ["HS256"],
    };

    if (options.algorithm) {
      jwtOptions.algorithms = [options.algorithm];
    }

    if (options.issuer) {
      jwtOptions.issuer = options.issuer;
    }

    if (options.audience) {
      jwtOptions.audience = options.audience;
    }

    passport.use(
      new JwtStrategy(jwtOptions, async (payload, done) => {
        if (this.validators?.jwt) {
          const result = await this.validators?.jwt.validate(payload);

          if (result.isFailure) {
            return done(result.failure.error, false);
          }

          return done(null, result.content);
        }

        return done(new Error(`Missing JWT validator`), false);
      })
    );
  }

  private setupBasicStrategy(options: any) {
    passport.use(
      new BasicStrategy(async (username, password, done) => {
        if (this.validators?.basic) {
          const result = await this.validators?.basic.validate(
            username,
            password
          );

          if (result.isFailure) {
            return done(result.failure.error, false);
          }

          return done(null, result.content);
        }

        return done(new Error(`Missing Basic validator`), false);
      })
    );
  }

  private setupGoogleStrategy(options: any) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: options.clientID,
          clientSecret: options.clientSecret,
          callbackURL: options.callbackURL,
        },
        async (accessToken, refreshToken, profile, done) => {
          if (this.validators?.google) {
            const result = await this.validators?.google.validate(
              accessToken,
              refreshToken,
              profile
            );

            if (result.isFailure) {
              return done(result.failure.error, false);
            }

            return done(null, result.content);
          }

          return done(new Error(`Missing Google validator`), false);
        }
      )
    );
  }

  private setupFacebookStrategy(options: any) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: options.clientID,
          clientSecret: options.clientSecret,
          callbackURL: options.callbackURL,
        },
        async (accessToken, refreshToken, profile, done) => {
          if (this.validators?.facebook) {
            const result = await this.validators?.facebook.validate(
              accessToken,
              refreshToken,
              profile
            );

            if (result.isFailure) {
              return done(result.failure.error, false);
            }

            return done(null, result.content);
          }

          return done(new Error(`Missing Facebook validator`), false);
        }
      )
    );
  }

  private setupApiKeyStrategy(options: Soap.AuthOptions) {
    passport.use(
      "apiKey",
      new CustomStrategy(setupApiKeyStrategy(options, this.validators?.apiKey))
    );
  }
}
