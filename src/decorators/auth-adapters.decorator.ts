import 'reflect-metadata';
import { AuthAdapter } from '../abstract-classes/auth-adapter.abstract.class';
import { Constructor } from 'type-fest';

export const AUTH_ADAPTERS = Symbol();

export const AuthAdapters = (adapters?: Constructor<AuthAdapter>[]): PropertyDecorator => {
    return (target, propertyKey) => {
        Reflect.defineMetadata(AUTH_ADAPTERS, Array.isArray(adapters) ? adapters : [], target, propertyKey);
    };
};
