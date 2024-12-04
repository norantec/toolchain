import { ClassType } from '../types/class-type.type';
import { Body } from '@nestjs/common';

export function ReflectedBody(): ParameterDecorator {
    return (target: ClassType, propertyKey: string, parameterIndex: number) => {
        Reflect.defineMetadata(ReflectedBody.metadataKey, parameterIndex, target?.constructor, propertyKey);
        Body()(target, propertyKey, parameterIndex);
    };
}

ReflectedBody.metadataKey = Symbol('');
