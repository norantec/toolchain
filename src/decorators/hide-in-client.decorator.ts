import 'reflect-metadata';

export const HIDE_IN_CLIENT = Symbol();

export const HideInClient = (): PropertyDecorator => {
    return (target, propertyKey) => {
        Reflect.defineMetadata(HIDE_IN_CLIENT, true, target, propertyKey);
    };
};
