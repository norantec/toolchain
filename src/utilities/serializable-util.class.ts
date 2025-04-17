import {
    ClassConstructor,
    ClassTransformOptions,
    instanceToPlain as i2p,
    plainToInstance as p2i,
} from 'class-transformer';
import { GROUP } from '../constants/group.constant';
import { Constructor } from 'type-fest';

export class SerializableUtil {
    public static instanceToPlain<T = unknown>(object: T, options: ClassTransformOptions = {}) {
        return i2p(object, {
            groups: [GROUP.EXPOSE_ALL],
            excludeExtraneousValues: true,
            enableImplicitConversion: true,
            ...options,
        });
    }

    public static plainToInstance<T = Constructor<any>>(
        cls: ClassConstructor<T>,
        plain: Partial<T>,
        options: ClassTransformOptions = {},
    ): T {
        return p2i<T, Partial<T>>(cls, plain, {
            groups: [GROUP.EXPOSE_ALL],
            excludeExtraneousValues: true,
            enableImplicitConversion: true,
            ...options,
        });
    }
}
