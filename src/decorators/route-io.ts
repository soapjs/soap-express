import { DecoratorRegistry } from './registry';
import { Request, Response } from 'express';
import { ExpressIO } from '../types';

export type RouteIOMapping = {
  from?: (req: Request) => any;
  to?: (result: any, res: Response) => void;
};

// RouteIO decorator that accepts either an ExpressIO class or mapping functions
export function RouteIO(ioOrMapping: ExpressIO | RouteIOMapping) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const metadata = DecoratorRegistry.getRoute(target, propertyKey);
    if (metadata) {
      let expressIO: ExpressIO;

      // If it's already an ExpressIO instance/class
      if ('from' in ioOrMapping && 'to' in ioOrMapping) {
        expressIO = ioOrMapping as ExpressIO;
      } else {
        // If it's mapping functions, create ExpressIO
        const mapping = ioOrMapping as RouteIOMapping;
        expressIO = {
          from: <T = Request>(source: T) => {
            const req = source as Request;
            return mapping.from ? mapping.from(req) : req.body;
          },
          to: <T = Response>(result: any, target: T) => {
            const res = target as Response;
            if (mapping.to) {
              mapping.to(result, res);
            } else {
              res.json(result);
            }
          }
        };
      }

      metadata.routeIO = expressIO;
    }
  };
}
