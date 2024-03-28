# SoapExpress

SoapExpress is a utility package designed to streamline the integration of SoapJS with Express, providing a structured approach to creating and managing Express servers, routes, and authentication. With built-in support for dependency injection and a suite of authentication validators, SoapExpress simplifies the process of building robust, secure APIs.

## Features

- Seamless integration with SoapJS and Express.
- Custom `SoapExpressRouter` for easy route management.
- `SoapExpressServer` for initializing and running Express applications.
- `SoapAuthManager` for straightforward authentication using various strategies.
- Supports dependency injection containers.
- Simplified authentication setup with pre-defined validators.

## Getting Started

To get started with SoapExpress, follow these steps to set up and run your server.

### Installation

First, install the package along with its peer dependencies if you haven't already:

```bash
npm install @soapjs/soap-express @soapjs/soap express
npm install inversify reflect-metadata

# OR use soap-cli to build new project
soap new project
```

### Setup

1. **Configure Your Server and Router**

Create a new file (e.g., `index.ts`) and import the necessary classes and dependencies. Define your server configuration, create a container for dependency injection, and initialize your custom router and dependencies.

```typescript
// config.ts
import * as Soap from "@soapjs/soap";

export class Config {
  static create() {
    const vars = new Soap.ConfigVars(); // read .env file
    return new Config(vars.getNumberEnv('PORT'));
  }

  private constructor(
    public readonly port: number,
    // ...rest
  ){}
}
```

```typescript
// index.ts
import 'reflect-metadata';
import * as Soap from '@soapjs/soap';
import { SoapExpressServer } from '@soapjs/soap-express';
import express from 'express';
import { Container } from 'inversify';

// Import or define your custom router and dependencies
import { Router } from './router';
import { Dependencies } from './dependencies';

const config = Config.create();
const server = new SoapExpressServer(config);
// Create ioc container
const container = new Container();
// Create dependencies
const dependencies = new Dependencies(container);
dependencies.configure();
// Create router
const router = new Router(server.app, container, config);
router.configure();

// Run server
server.start();
```

2. **Extend `SoapExpressRouter`**

Extend `SoapExpressRouter` to define your routes. Use the provided `SoapAuthManager` for authentication and validators for different strategies (JWT, Basic Auth, OAuth, etc.).

```typescript
// router.ts
import { SoapExpressRouter, AuthValidators } from 'soap-express';
import { Container } from 'inversify';

export class Router extends SoapExpressRouter<Container> {
  constructor(framework: Express, container: Container, config: Config) {
    // Auth validators are not mandatory;
    // if your API does not require authentication, omit the last argument.
    super(
      framework,
      container,
      config,
      {
        basic: new YourBasicValidator(container)
      }
    );
  }

  configure() {
    // In this method you need to bind all the routes as follows:
    const usersController = this.container.get<UsersController>(UsersController.Token);
    this.mount(
      UsersRoute.create(usersController.getUser.bind(usersController), this.config),
    );
    // IF you use soap CLI to create routes or controller handlers, the binding is done for you
  }
}
```

3. **Define Dependencies**

Define a class to manage your application's dependencies.

```typescript
// dependencies.ts
import { Container } from 'inversify';
import * as Soap from '@soapjs/soap';

export class Dependencies implements Soap.Dependencies {
  constructor(
    protected container: Container,
    protected config: Config){}

  configure() {
    // In this method you need to bind all the dependencies as follows:
    container.bind<UserController>(UserController.Token).to(UserController);
    // IF you use soap CLI to create domain components, the binding is done for you
  }
}
```

### Running the Server

Run your server using Node.js or a process manager like PM2. Ensure that your entry point (e.g., `index.ts`) is correctly specified.

```bash
node index.ts
```

Your Express server should start, and it will log the listening port to the console.

## Authentication

The `SoapAuthManager` class facilitates the setup of various authentication strategies. You must provide the necessary validators and configurations for each strategy you intend to use. Visit [SoapJS documentation](https://docs.soapjs.com) for detailed instructions.

## Documentation

For detailed documentation and additional usage examples, visit [SoapJS documentation](https://docs.soapjs.com).

## Issues
If you encounter any issues, please feel free to report them [here](https://github.com/soapjs/soap/issues/new/choose).

## Contact
For any questions, collaboration interests, or support needs, you can contact us through the following:

- Official:
  - Email: [contact@soapjs.com](mailto:contact@soapjs.com)
  - Website: https://soapjs.com
- Radoslaw Kamysz:
  - Email: [radoslaw.kamysz@gmail.com](mailto:radoslaw.kamysz@gmail.com)
  - Warpcast: [@k4mr4ad](https://warpcast.com/k4mr4ad)
  - Twitter: [@radoslawkamysz](https://x.com/radoslawkamysz)

## License

@soapjs/soap-express is [MIT licensed](./LICENSE).