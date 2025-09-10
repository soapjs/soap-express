import { UploadedFile } from './index';

declare global {
  namespace Express {
    interface Request {
      file?: UploadedFile;
      files?: UploadedFile[] | { [fieldname: string]: UploadedFile[] };
    }
  }
}

export {};
