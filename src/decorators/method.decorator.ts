import 'reflect-metadata';
import { Post } from '@nestjs/common';
import * as _ from 'lodash';
import { METADATA_NAMES } from '../constants/metadata-names.constant';
import { ApiOkResponse } from '@nestjs/swagger';
import { OpenApiUtil } from '../utilities/openapi-util.class';
import { reflect } from 'typescript-rtti';
import { ClassType } from '../types/class-type.type';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { ResponseDTO } from '../dtos/response.dto.class';

export type AdminMode = 'both' | 'normal' | 'admin';

export function Method(adminMode: AdminMode = 'both'): MethodDecorator {
    return (target: ClassType, propertyKey: string, descriptor: PropertyDescriptor) => {
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
            METADATA_NAMES.SCOPE_NAME,
            scopeIdentifier.split('.').slice(0, -1).join('.'),
            target?.constructor,
        );
        Post(scopeNames)(target, propertyKey, descriptor);

        const returnTypeStr = reflect(target).getMethod(propertyKey)?.returnType?.toString?.();
        const {
            schema,
            Clazz,
        } = OpenApiUtil.generateSchemaAndClassName(returnTypeStr);
        let existedExtraModels = Reflect.getMetadata(DECORATORS.API_EXTRA_MODELS, target?.constructor);

        if (!Array.isArray(existedExtraModels)) {
            existedExtraModels = [];
        }

        Reflect.defineMetadata(
            DECORATORS.API_EXTRA_MODELS,
            _.uniq(existedExtraModels.concat([
                Clazz,
                ResponseDTO,
            ])),
            target?.constructor,
        );

        ApiOkResponse({ schema })(target, propertyKey, descriptor);
    };
}
