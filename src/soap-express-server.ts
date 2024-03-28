import * as Soap from "@soapjs/soap";
import express, { Express } from "express";
import * as bodyParser from "body-parser";
import cors from "cors";

export class SoapExpressServer {
  private _app: Express;

  constructor(private config: Soap.Config) {
    this._app = express();
    this._app.use(
      cors({
        origin: "*",
      })
    );
    this._app.use(bodyParser.json());
  }

  get app(): Express {
    return this._app;
  }

  public start(): Express {
    this._app.listen(this.config.port, () => {
      console.log(`Server is running at http://localhost:\${config.port}`);
    });
    return this._app;
  }
}
