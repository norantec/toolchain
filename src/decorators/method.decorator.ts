import {
    Post,
    UseGuards,
} from '@nestjs/common';
import * as _ from 'lodash';
import { METADATA_NAMES } from '../constants/metadata-names.constant';
import { ApiOkResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { StringUtil } from '../utilities/string-util.class';

export type AdminMode = 'both' | 'normal' | 'admin';

export function Method(adminMode: AdminMode = 'both', authStrategies?: string[] | false): MethodDecorator {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        const controllerNameSegments = _.kebabCase(target?.constructor?.name).split('-').slice(0, -1);
        let controllerName = _.camelCase(controllerNameSegments.join('-'));
        const apiName = [controllerName, propertyKey].join('.');
        const scopeIdentifier = apiName;
        const originalScopeNameList = Reflect.getMetadata(METADATA_NAMES.SCOPE_NAMES, target.constructor);

        let scopeNames: string[] = [];

        switch (adminMode) {
            case 'both':
                scopeNames = [
                    scopeIdentifier,
                    `admin.${scopeIdentifier}`,
                ];
                break;
            case 'admin':
                scopeNames = [
                    `admin.${scopeIdentifier}`,
                ];
                break;
            case 'normal':
                scopeNames = [
                    scopeIdentifier,
                ];
                break;
            default:
                break;
        }

        Reflect.defineMetadata(
            METADATA_NAMES.SCOPE_NAMES,
            Array.isArray(originalScopeNameList)
                ? originalScopeNameList.concat(scopeNames)
                : scopeNames,
            target.constructor,
        );
        Reflect.defineMetadata(
            METADATA_NAMES.METHOD_SCOPE_NAMES,
            scopeNames,
            target.constructor,
            propertyKey,
        );
        ApiOkResponse({ description: 'Success' })(target, propertyKey, descriptor);
        Post(scopeNames)(target, propertyKey, descriptor);

        if (authStrategies !== false) {
            UseGuards(AuthGuard(...(Array.isArray(authStrategies) ? authStrategies : []).filter((value) => !StringUtil.isFalsyString(value))))(target);
        }
    };
}
