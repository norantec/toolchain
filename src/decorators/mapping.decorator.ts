import { ExposeOptions, Expose } from 'class-transformer';
import { GROUP } from '../constants/group.constant';

export interface MappingOptions extends ExposeOptions {
    enumValues?: any[];
    hideOpenApiProperty?: boolean;
}

export type MappingMetadata = Array<[string, MappingOptions]>;

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
            ...(() => {
                if (Array.isArray(options?.groups)) {
                    return {
                        groups: [GROUP.EXPOSE_ALL].concat(options.groups),
                    };
                }
                return {};
            })(),
        } as ExposeOptions)(target, propertyKey);
    };
}

Mapping.metadataKey = Symbol('');
