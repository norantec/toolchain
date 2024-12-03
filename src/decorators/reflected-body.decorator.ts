import { ClassType } from '../types/class-type.type';
import { reflect } from 'typescript-rtti';
import { OpenApiUtil } from '../utilities/openapi-util.class';
import { Body } from '@nestjs/common';
import { TransformPipe } from '../pipes/transform.pipe';
import { ApiBody } from '@nestjs/swagger';

export function ReflectedBody(): ParameterDecorator {
    return (target: ClassType, propertyKey: string, parameterIndex: number) => {
        const parameterTypeStr = reflect(target).getMethod(propertyKey)?.parameterTypes?.[parameterIndex]?.toString?.();
        const {
            schema,
            Clazz,
        } = OpenApiUtil.generateSchemaAndClassName(parameterTypeStr);
        ApiBody({ schema })(target, propertyKey, Reflect.getOwnPropertyDescriptor(target, propertyKey));
        Body(TransformPipe(Clazz))(target, propertyKey, parameterIndex);
    };
}
