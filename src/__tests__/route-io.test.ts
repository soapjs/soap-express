import { PaginationIO, FileUploadIO, SimpleIO, Pagination, FileUpload } from '../route-io';
import { Request, Response } from 'express';
import { Result } from '@soapjs/soap';

describe('RouteIO Classes', () => {
  describe('PaginationIO', () => {
    let paginationIO: PaginationIO;
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;

    beforeEach(() => {
      paginationIO = new PaginationIO();
      mockReq = {
        query: {
          page: '2',
          limit: '20',
          sort: 'name',
          filters: '{"status":"active"}'
        }
      };
      mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };
    });

    describe('from', () => {
      it('should extract pagination parameters from request', () => {
        const result = paginationIO.from(mockReq as Request);

        expect(result).toEqual({
          page: 2,
          limit: 20,
          sort: 'name',
          filters: { status: 'active' }
        });
      });

      it('should use default values when parameters are missing', () => {
        mockReq.query = {};

        const result = paginationIO.from(mockReq as Request);

        expect(result).toEqual({
          page: 1,
          limit: 10,
          sort: undefined,
          filters: {}
        });
      });

      it('should handle invalid page number', () => {
        mockReq.query = { page: 'invalid' };

        const result = paginationIO.from(mockReq as Request);

        expect(result.page).toBe(1);
      });

      it('should handle invalid limit number', () => {
        mockReq.query = { limit: 'invalid' };

        const result = paginationIO.from(mockReq as Request);

        expect(result.limit).toBe(10);
      });

      it('should handle invalid JSON filters', () => {
        mockReq.query = { filters: 'invalid-json' };

        const result = paginationIO.from(mockReq as Request);

        expect(result.filters).toEqual({});
      });

      it('should handle missing filters', () => {
        mockReq.query = { page: '1', limit: '10' };

        const result = paginationIO.from(mockReq as Request);

        expect(result.filters).toEqual({});
      });
    });

    describe('to', () => {
      it('should send successful pagination response', () => {
        const paginationData: Pagination = {
          data: [{ id: 1, name: 'test' }],
          pagination: {
            page: 2,
            limit: 20,
            total: 100,
            pages: 5,
            hasNext: true,
            hasPrev: true
          }
        };

        const successResult: Result<Pagination> = {
          isSuccess: () => true,
          content: paginationData
        } as any;

        paginationIO.to(successResult, mockRes as Response);

        expect(mockRes.json).toHaveBeenCalledWith({
          data: paginationData,
          pagination: {
            page: 2,
            total: 100,
            pages: 5,
            hasNext: true,
            hasPrev: true
          }
        });
      });

      it('should handle missing pagination data', () => {
        const paginationData: Pagination = {
          data: [{ id: 1, name: 'test' }],
          pagination: undefined as any
        };

        const successResult: Result<Pagination> = {
          isSuccess: () => true,
          content: paginationData
        } as any;

        paginationIO.to(successResult, mockRes as Response);

        expect(mockRes.json).toHaveBeenCalledWith({
          data: paginationData,
          pagination: {
            page: 1,
            total: 0,
            pages: 1,
            hasNext: false,
            hasPrev: false
          }
        });
      });

      it('should send error response for failed result', () => {
        const errorResult: Result<Pagination> = {
          isSuccess: () => false,
          failure: {
            error: new Error('Database error')
          }
        } as any;

        paginationIO.to(errorResult, mockRes as Response);

        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
      });

      it('should send generic error for failed result without error', () => {
        const errorResult: Result<Pagination> = {
          isSuccess: () => false,
          failure: {}
        } as any;

        paginationIO.to(errorResult, mockRes as Response);

        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
      });

      it('should handle undefined result', () => {
        paginationIO.to(undefined as any, mockRes as Response);

        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
      });
    });
  });

  describe('FileUploadIO', () => {
    let fileUploadIO: FileUploadIO;
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;

    beforeEach(() => {
      fileUploadIO = new FileUploadIO();
      mockReq = {
        file: {
          fieldname: 'file',
          originalname: 'test.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          size: 1024,
          destination: '/uploads',
          filename: 'test.jpg',
          path: '/uploads/test.jpg'
        }
      };
      mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };
    });

    describe('from', () => {
      it('should extract file information from request', () => {
        const result = fileUploadIO.from(mockReq as any);

        expect(result).toEqual({
          file: mockReq.file,
          metadata: {
            originalName: 'test.jpg',
            size: 1024,
            mimetype: 'image/jpeg'
          }
        });
      });

      it('should handle missing file', () => {
        mockReq.file = undefined;

        const result = fileUploadIO.from(mockReq as any);

        expect(result).toEqual({
          file: undefined,
          metadata: {
            originalName: undefined,
            size: undefined,
            mimetype: undefined
          }
        });
      });
    });

    describe('to', () => {
      it('should send successful file upload response', () => {
        const fileData: FileUpload = {
          id: 'file-123',
          url: 'https://example.com/files/file-123'
        };

        const successResult: Result<FileUpload> = {
          isSuccess: () => true,
          content: fileData
        } as any;

        fileUploadIO.to(successResult, mockRes as Response);

        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          fileId: 'file-123',
          url: 'https://example.com/files/file-123'
        });
      });

      it('should send error response for failed result', () => {
        const errorResult: Result<FileUpload> = {
          isSuccess: () => false,
          failure: {
            error: new Error('Upload failed')
          }
        } as any;

        fileUploadIO.to(errorResult, mockRes as Response);

        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Upload failed' });
      });

      it('should send generic error for failed result without error', () => {
        const errorResult: Result<FileUpload> = {
          isSuccess: () => false,
          failure: {}
        } as any;

        fileUploadIO.to(errorResult, mockRes as Response);

        expect(mockRes.json).toHaveBeenCalledWith({ error: 'File upload failed' });
      });

      it('should handle undefined result', () => {
        fileUploadIO.to(undefined as any, mockRes as Response);

        expect(mockRes.json).toHaveBeenCalledWith({ error: 'File upload failed' });
      });
    });
  });

  describe('SimpleIO', () => {
    let simpleIO: SimpleIO;
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;

    beforeEach(() => {
      simpleIO = new SimpleIO();
      mockReq = {
        body: { name: 'test', email: 'test@example.com' }
      };
      mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };
    });

    describe('from', () => {
      it('should return request body', () => {
        const result = simpleIO.from(mockReq as Request);

        expect(result).toEqual({ name: 'test', email: 'test@example.com' });
      });

      it('should handle empty body', () => {
        mockReq.body = {};

        const result = simpleIO.from(mockReq as Request);

        expect(result).toEqual({});
      });

      it('should handle undefined body', () => {
        mockReq.body = undefined;

        const result = simpleIO.from(mockReq as Request);

        expect(result).toBeUndefined();
      });
    });

    describe('to', () => {
      it('should send successful response', () => {
        const data = { id: 1, name: 'test' };

        const successResult: Result<any> = {
          isSuccess: () => true,
          content: data
        } as any;

        simpleIO.to(successResult, mockRes as Response);

        expect(mockRes.json).toHaveBeenCalledWith(data);
      });

      it('should send error response for failed result', () => {
        const errorResult: Result<any> = {
          isSuccess: () => false,
          failure: {
            error: new Error('Validation failed')
          }
        } as any;

        simpleIO.to(errorResult, mockRes as Response);

        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Validation failed' });
      });

      it('should send generic error for failed result without error', () => {
        const errorResult: Result<any> = {
          isSuccess: () => false,
          failure: {}
        } as any;

        simpleIO.to(errorResult, mockRes as Response);

        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
      });

      it('should handle undefined result', () => {
        simpleIO.to(undefined as any, mockRes as Response);

        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
      });
    });
  });

  describe('edge cases', () => {
    it('should handle null values in pagination', () => {
      const paginationIO = new PaginationIO();
      const mockReq = { query: { page: null, limit: null } } as any;
      const mockRes = { json: jest.fn() } as any;

      const result = paginationIO.from(mockReq);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should handle empty string values in pagination', () => {
      const paginationIO = new PaginationIO();
      const mockReq = { query: { page: '', limit: '' } } as any;

      const result = paginationIO.from(mockReq);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should handle very large page numbers', () => {
      const paginationIO = new PaginationIO();
      const mockReq = { query: { page: '999999999' } } as any;

      const result = paginationIO.from(mockReq);

      expect(result.page).toBe(999999999);
    });

    it('should handle zero and negative values', () => {
      const paginationIO = new PaginationIO();
      const mockReq = { query: { page: '0', limit: '-5' } } as any;

      const result = paginationIO.from(mockReq);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(-5);
    });
  });
});
