import { UploadedFile } from './index';

declare global {
  namespace Express {
    interface Request {
      file?: UploadedFile;
      files?: UploadedFile[] | { [fieldname: string]: UploadedFile[] };
      auth?: {
        token?: string;
        type?: string;
        payload?: any;
        result?: any;
        tokens?: Record<string, string | undefined>;
        session?: any;
      };
    }
  }
}

export {};
