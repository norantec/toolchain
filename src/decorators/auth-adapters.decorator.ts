import 'reflect-metadata';
import { AuthAdapter } from '../abstract-classes/auth-adapter.abstract.class';

export const AUTH_ADAPTERS = Symbol();

export const AuthAdapters = (adapters?: AuthAdapter[]): PropertyDecorator => {
    return (target, propertyKey) => {
        Reflect.defineMetadata(AUTH_ADAPTERS, Array.isArray(adapters) ? adapters : [], target, propertyKey);
    };
};
