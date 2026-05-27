import { DecoratorRegistry } from './registry';
import { Injectable } from '@soapjs/soap/common';

export function CallUseCase(useCaseClass: any) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const metadata = DecoratorRegistry.getRoute(target, propertyKey);
    if (metadata) {
      metadata.useCase = useCaseClass;
    }
  };
}

export function UseCase() {
  return function (target: any) {
    // Automatically register use case as injectable
    Injectable()(target);
  };
}
