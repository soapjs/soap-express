import { Request, Response } from 'express';
import { Result } from '@soapjs/soap';
import { RequestWithFile, ExpressIO, UploadedFile } from './types';


export type Pagination = {
  data: any;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

// Predefined ExpressIO implementations
export class PaginationIO implements ExpressIO {
  from<T = Request>(source: T) {
    const req = source as Request;
    return {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10,
      sort: req.query.sort as string,
      filters: req.query.filters ? (() => {
        try {
          return JSON.parse(req.query.filters as string);
        } catch {
          return {};
        }
      })() : {}
    };
  }

  to<T = Response>(result: Result<Pagination>, target: T) {
    const res = target as Response;
    if (result?.isSuccess && result.isSuccess()) {
      res.json({
        data: result.content,
        pagination: {
          page: result.content.pagination?.page || 1,
          total: result.content.pagination?.total || 0,
          pages: result.content.pagination?.pages || 1,
          hasNext: result.content.pagination?.hasNext || false,
          hasPrev: result.content.pagination?.hasPrev || false
        }
      });
    } else {
      if (result?.failure?.error) {
        res.status(400).json({ error: result.failure.error.message });
      } else {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  }
}

export type FileUpload = {
  id: string | number;
  url: string;
};

export class FileUploadIO implements ExpressIO {
  from<T = RequestWithFile>(source: T) {
    const req = source as RequestWithFile;
    return {
      file: req.file,
      metadata: {
        originalName: req.file?.originalname,
        size: req.file?.size,
        mimetype: req.file?.mimetype
      }
    };
  }

  to<T = Response>(result: Result<FileUpload>, target: T) {
    const res = target as Response;
    if (result?.isSuccess && result.isSuccess()) {
      res.json({
        success: true,
        fileId: result.content.id,
        url: result.content.url
      });
    } else {
      if (result?.failure?.error) {
        res.status(400).json({ error: result.failure.error.message });
      } else {
        res.status(500).json({ error: 'File upload failed' });
      }
    }
  }
}

export class SimpleIO implements ExpressIO {
  from<T = Request>(source: T) {
    const req = source as Request;
    return req.body;
  }

  to<T = Response>(result: Result<any>, target: T) {
    const res = target as Response;
    if (result?.isSuccess && result.isSuccess()) {
      res.json(result.content);
    } else {
      if (result?.failure?.error) {
        res.status(400).json({ error: result.failure.error.message });
      } else {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  }
}
