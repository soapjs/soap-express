import { dispatchResult, resolveUseCase } from '../route-dispatch';
import { Result, Failure } from '@soapjs/soap';
import { ResultMapper } from '../../result-mapper';
import { ExpressIO } from '../../types';

describe('route-dispatch', () => {
  let res: any;

  beforeEach(() => {
    res = { status: jest.fn().mockReturnThis(), json: jest.fn(), headersSent: false };
  });

  describe('dispatchResult', () => {
    it('routes a FAILED result to ResultMapper, even when a RouteIO is set', () => {
      const spy = jest.spyOn(ResultMapper, 'toResponse').mockImplementation(() => {});
      const io = { to: jest.fn() };
      const failed = Result.withFailure(Failure.fromError(new Error('boom')));

      dispatchResult(failed, res, io);

      expect(spy).toHaveBeenCalledWith(failed, res);
      expect(io.to).not.toHaveBeenCalled(); // the key fix: failures never bypass ResultMapper
      spy.mockRestore();
    });

    it('shapes a SUCCESSFUL result through the RouteIO', () => {
      const io = { to: jest.fn() };
      const ok = Result.withSuccess({ a: 1 });

      dispatchResult(ok, res, io);

      expect(io.to).toHaveBeenCalledWith(ok, res);
    });

    it('passes result before response to a full ExpressIO object', () => {
      const io: ExpressIO = {
        from: jest.fn(),
        to: jest.fn()
      };
      const ok = Result.withSuccess({ a: 1 });

      dispatchResult(ok, res, io);

      expect(io.to).toHaveBeenCalledWith(ok, res);
      expect(io.to).not.toHaveBeenCalledWith(res, ok);
    });

    it('uses ResultMapper for a successful result without a RouteIO', () => {
      const spy = jest.spyOn(ResultMapper, 'toResponse').mockImplementation(() => {});
      const ok = Result.withSuccess({ a: 1 });

      dispatchResult(ok, res);

      expect(spy).toHaveBeenCalledWith(ok, res);
      spy.mockRestore();
    });

    it('json-sends a raw (non-Result) value without a RouteIO', () => {
      dispatchResult({ a: 1 }, res);
      expect(res.json).toHaveBeenCalledWith({ a: 1 });
    });

    it('is a no-op for undefined (handler already wrote the response)', () => {
      const io = { to: jest.fn() };
      dispatchResult(undefined, res, io);
      expect(io.to).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('resolveUseCase', () => {
    it('prefers a static Token over the class name', () => {
      const get = jest.fn().mockReturnValue('instance');
      class Foo { static Token = 'foo-token'; }

      const out = resolveUseCase({ get }, Foo);

      expect(get).toHaveBeenCalledWith('foo-token');
      expect(out).toBe('instance');
    });

    it('falls back to the class name when no Token is present', () => {
      const get = jest.fn();
      class Bar {}

      resolveUseCase({ get }, Bar);

      expect(get).toHaveBeenCalledWith('Bar');
    });
  });
});
