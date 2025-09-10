import { DecoratorRegistry } from './registry';

export function CallUseCase(useCaseClass: any) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const metadata = DecoratorRegistry.getRoute(target, propertyKey);
    if (metadata) {
      metadata.useCase = useCaseClass;
    }
  };
}
