import { Constructor } from 'type-fest';
import { OpenApiGeneratorOptions } from '../../../../utilities/sdk-util.class';

type Resolver = <T>(Class: Constructor<T>) => Promise<T>;

export interface AppEntryConfig {
    Module: Constructor<any>;
    sdk?: Pick<OpenApiGeneratorOptions, 'customizeRequestBodyType' | 'customizeResponseDataType'>;
    scopeIdentifierBlacklist?: string[];
    uses?: any[];
    getListenPort: (resolver: Resolver) => number | Promise<number>;
    callback?: (resolver: Resolver) => void | Promise<void>;
    onBeforeBootstrap?: () => void | Promise<void>;
}
