import { Request, Response } from 'express';
import { Result } from '@soapjs/soap/common';
import { IO } from '@soapjs/soap/middleware';
import { RequestWithFile, ExpressIO, UploadedFile } from './types';
import { ResultMapper } from './result-mapper';


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
    // Failures go through ResultMapper for consistent status mapping.
    if (!(result?.isSuccess && result.isSuccess())) {
      if (result instanceof Result) ResultMapper.toResponse(result, res);
      else if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    const { data, pagination } = result.content;
    res.json({
      data,
      pagination: {
        page: pagination?.page || 1,
        limit: pagination?.limit || 0,
        total: pagination?.total || 0,
        pages: pagination?.pages || 1,
        hasNext: pagination?.hasNext || false,
        hasPrev: pagination?.hasPrev || false
      }
    });
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
    if (!(result?.isSuccess && result.isSuccess())) {
      if (result instanceof Result) ResultMapper.toResponse(result, res);
      else if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    res.json({ success: true, fileId: result.content.id, url: result.content.url });
  }
}

export class SimpleIO implements ExpressIO {
  from<T = Request>(source: T) {
    const req = source as Request;
    return req.body;
  }

  to<T = Response>(result: Result<any>, target: T) {
    const res = target as Response;
    if (!(result?.isSuccess && result.isSuccess())) {
      if (result instanceof Result) ResultMapper.toResponse(result, res);
      else if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    res.json(result.content);
  }
}
