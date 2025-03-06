import { Body } from '@nestjs/common';
import { Constructor } from 'type-fest';

export function ReflectedBody(): ParameterDecorator {
    return (target: Constructor<any>, propertyKey: string, parameterIndex: number) => {
        Reflect.defineMetadata(ReflectedBody.metadataKey, parameterIndex, target?.constructor, propertyKey);
        Body()(target, propertyKey, parameterIndex);
    };
}

ReflectedBody.metadataKey = Symbol('');
