import {
    Body,
    PipeTransform,
    Type,
} from '@nestjs/common';

export const Input = (property: string, ...pipes: (Type<PipeTransform> | PipeTransform)[]): ParameterDecorator => {
    return (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) => {
        console.log(
            'LENCONDA:FUCK',
            target,
            property,
            parameterIndex,
        );
        Body(property, ...pipes)(target, propertyKey, parameterIndex);
    };
};
