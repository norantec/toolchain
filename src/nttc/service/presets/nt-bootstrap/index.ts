import { Constructor } from 'type-fest';

type Resolver = <T>(Class: Constructor<T>) => Promise<T>;

export interface AppEntryConfig {
    Module: Constructor<any>;
    scopeIdentifierBlacklist?: string[];
    getListenPort: (resolver: Resolver) => number | Promise<number>;
    callback?: (resolver: Resolver) => void | Promise<void>;
    onBeforeBootstrap?: () => void | Promise<void>;
}
