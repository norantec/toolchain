import {
    ExposeOptions,
    Expose,
} from 'class-transformer';
import { GROUP } from '../constants/group.constant';

export type MappingMetadata = Array<[string, ExposeOptions]>;
export interface MappingOptions extends ExposeOptions {
    hideOpenApiProperty?: boolean;
}

export function Mapping(options: MappingOptions = {}) {
    return (target: any, propertyKey: string) => {
        let currentValue: MappingMetadata = Reflect.getMetadata(Mapping.metadataKey, target);

        if (!Array.isArray(currentValue)) {
            currentValue = [];
        }

        currentValue.push([propertyKey, options]);

        if (!options?.hideOpenApiProperty) {
            Reflect.defineMetadata(Mapping.metadataKey, currentValue, target);
        }

        Expose({
            ...options,
            ...(
                Array.isArray(options?.groups)
                    ? {
                        groups: [GROUP.EXPOSE_ALL].concat(options.groups),
                    }
                    : {}
            ),
        } as ExposeOptions)(target, propertyKey);
    };
}

Mapping.metadataKey = Symbol('');
