import 'reflect-metadata';
import { Post } from '@nestjs/common';
import * as _ from 'lodash';
import { METADATA_NAMES } from 'src/constants/metadata-names.constant';
import {
    ApiBody,
    ApiOkResponse,
    getSchemaPath,
} from '@nestjs/swagger';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { ClassType } from 'src/types/class-type.type';
import { ResponseVO } from 'src/vos/response.vo.class';

export type AdminMode = 'both' | 'normal' | 'admin';
type TypeDeclaration = ClassType | Array<TypeDeclaration>;

export function Method(
    inputOrArrayedInput: TypeDeclaration,
    outputOrArrayedOutput: TypeDeclaration,
    adminMode: AdminMode = 'both',
    Decorator?: (...params: any[]) => MethodDecorator,
) {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        const controllerNameSegments = _.kebabCase(target?.constructor?.name).split('-').slice(0, -1);
        let controllerName = _.camelCase(controllerNameSegments.join('-'));
        const apiName = [controllerName, propertyKey].join('.');
        const scopeIdentifier = apiName;
        const originalScopeNameList = Reflect.getMetadata(METADATA_NAMES.SCOPE_NAMES, target.constructor);
        const getSchemaAndType = (inputValue: TypeDeclaration) => {
            if (Array.isArray(inputValue)) {
                const schemaAndType = getSchemaAndType(inputValue?.[0]);
                return {
                    type: schemaAndType?.type,
                    schema: {
                        type: 'array',
                        items: schemaAndType?.schema,
                    },
                };
            } else {
                return {
                    type: inputValue as ClassType,
                    schema: {
                        $ref: getSchemaPath(inputValue),
                    },
                };
            }
        };
        const {
            type: output,
            schema: outputSchema,
        } = getSchemaAndType(outputOrArrayedOutput);

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

        (typeof Decorator === 'function' ? Decorator : Post)(scopeNames)(target, propertyKey, descriptor);

        let existedExtraModels = Reflect.getMetadata(DECORATORS.API_EXTRA_MODELS, target?.constructor);

        if (!Array.isArray(existedExtraModels)) {
            existedExtraModels = [];
        }

        Reflect.defineMetadata(
            DECORATORS.API_EXTRA_MODELS,
            _.uniq(existedExtraModels.concat([
                ...(output ? [output] : []),
                ResponseVO,
            ])),
            target?.constructor,
        );

        if (output) {
            ApiOkResponse({
                schema: {
                    allOf: [
                        {
                            $ref: getSchemaPath(ResponseVO),
                        },
                        {
                            properties: {
                                data: {
                                    type: 'array',
                                    items: outputSchema,
                                },
                            },
                            required: [
                                'data',
                            ],
                        },
                    ],
                },
            })(target, propertyKey, descriptor);
        }

        if (inputOrArrayedInput) {
            ApiBody({ type: () => inputOrArrayedInput })(target, propertyKey, descriptor);
        }
    };
}
