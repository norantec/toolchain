import {
    ArgumentMetadata,
    Injectable,
    mixin,
    PipeTransform,
    Type,
    ValidationPipe,
} from '@nestjs/common';
import { memoize } from 'lodash';

function createTransformPipe<T>(itemType: Type<T>): Type<PipeTransform> {
    @Injectable()
    class MixinTransformArrayDTOPipe extends ValidationPipe implements PipeTransform {
        public constructor() {
            super({
                transform: true,
                transformOptions: {
                    excludeExtraneousValues: true,
                    enableImplicitConversion: true,
                },
                forbidUnknownValues: true,
            });
        }

        public transform(values: T[], metadata: ArgumentMetadata): Promise<any[]> {
            const transformValue = async (value: any): Promise<any> => {
                if (Array.isArray(value)) {
                    return Promise.all(value.map(transformValue));
                }
                return super.transform(
                    value,
                    {
                        ...metadata,
                        metatype: itemType,
                    },
                );
            };
            return transformValue(values);
        }
    }
    return mixin(MixinTransformArrayDTOPipe);
}

export const TransformPipe: <T>(itemType: Type<T>) => Type<PipeTransform> = memoize(createTransformPipe);
