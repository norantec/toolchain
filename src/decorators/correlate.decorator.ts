import 'reflect-metadata';
import { Type } from 'class-transformer';
import { ClassType } from '../types/class-type.type';

type Factory = () => ClassType;
type CorrelateDecoratorFn = ((factory: Factory) => PropertyDecorator) & { metadataKey: symbol; };

export const Correlate: CorrelateDecoratorFn = (factory) => {
    return (target: any, propertyKey: string) => {
        let currentValue: Array<[string, Factory]> = Reflect.getMetadata(Correlate.metadataKey, target);

        if (!Array.isArray(currentValue)) {
            currentValue = [];
        }

        currentValue.push([propertyKey, factory]);

        Reflect.defineMetadata(Correlate.metadataKey, currentValue, target);
        Type(factory)(target, propertyKey);
    };
};

Correlate.metadataKey = Symbol('');
