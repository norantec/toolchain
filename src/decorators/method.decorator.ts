import { Post, UseGuards } from '@nestjs/common';
import * as _ from 'lodash';
import { METADATA_NAMES } from '../constants/metadata-names.constant';
import { AuthGuard } from '@nestjs/passport';
import { StringUtil } from '../utilities/string-util.class';

export type AdminMode = 'both' | 'normal' | 'admin';

export function Method(adminMode: AdminMode = 'both', allowedAuthAdapters?: string[] | boolean): MethodDecorator {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        const controllerNameSegments = _.kebabCase(target?.constructor?.name).split('-').slice(0, -1);
        const controllerName = _.camelCase(controllerNameSegments.join('-'));
        const apiName = [controllerName, propertyKey].join('.');
        const scopeIdentifier = apiName;
        const originalMethodNameList = Reflect.getMetadata(METADATA_NAMES.METHODS, target.constructor);
        const originalScopeIdentifierList = Reflect.getMetadata(METADATA_NAMES.SCOPE_IDENTIFIERS, target.constructor);

        let scopeIdentifiers: string[] = [];

        switch (adminMode) {
            case 'both':
                scopeIdentifiers = [scopeIdentifier, `admin.${scopeIdentifier}`];
                break;
            case 'admin':
                scopeIdentifiers = [`admin.${scopeIdentifier}`];
                break;
            case 'normal':
                scopeIdentifiers = [scopeIdentifier];
                break;
            default:
                break;
        }

        Reflect.defineMetadata(
            METADATA_NAMES.SCOPE_IDENTIFIERS,
            Array.isArray(originalScopeIdentifierList)
                ? originalScopeIdentifierList.concat(scopeIdentifiers)
                : scopeIdentifiers,
            target.constructor,
        );
        Reflect.defineMetadata(
            METADATA_NAMES.METHOD_SCOPE_IDENTIFIERS,
            scopeIdentifiers,
            target.constructor,
            propertyKey,
        );
        Reflect.defineMetadata(
            METADATA_NAMES.METHODS,
            Array.isArray(originalMethodNameList) ? originalMethodNameList.concat(propertyKey) : [propertyKey],
            target.constructor,
        );

        const finalAllowedAuthAdapters = Method.normalizeAllowedAdapters(allowedAuthAdapters);

        Reflect.defineMetadata(
            METADATA_NAMES.METHOD_AUTH_ADAPTERS,
            finalAllowedAuthAdapters,
            target.constructor,
            propertyKey,
        );
        Post(scopeIdentifiers)(target, propertyKey, descriptor);

        if (finalAllowedAuthAdapters !== false) {
            UseGuards(AuthGuard('auth'))(target);
        }
    };
}

Method.normalizeAllowedAdapters = (allowedAuthAdapters: string[] | boolean) => {
    let finalAllowedAuthAdapters: string[] | boolean;

    if (Array.isArray(allowedAuthAdapters)) {
        finalAllowedAuthAdapters = allowedAuthAdapters.filter((adapterName) => !StringUtil.isFalsyString(adapterName));
    } else if (typeof allowedAuthAdapters === 'boolean') {
        finalAllowedAuthAdapters = allowedAuthAdapters;
    } else {
        finalAllowedAuthAdapters = true;
    }

    return finalAllowedAuthAdapters;
};
