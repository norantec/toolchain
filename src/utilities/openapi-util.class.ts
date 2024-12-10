import { getSchemaPath } from '@nestjs/swagger';
import {
    InfoObject,
    OpenAPIObject,
    ReferenceObject,
    SchemaObject,
} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { ClassType } from '../types/class-type.type';
import { NestUtil } from './nest-util.class';
import { reflect } from 'typescript-rtti/dist/lib/reflect';
import { METADATA_NAMES } from '../constants/metadata-names.constant';
import { StringUtil } from './string-util.class';
import { ReflectedBody } from '../decorators/reflected-body.decorator';
import * as _ from 'lodash';
import { CommonExceptionUtil } from './common-exception-util.class';
import { ApiController } from '../decorators/api-controller.decorator';
import {
    Mapping,
    MappingMetadata,
} from '../decorators/mapping.decorator';
import { GROUP } from '../constants/group.constant';

interface OpenApiUtilOptions {
    Clazz: ClassType;
    info?: InfoObject;
}

export class OpenApiUtil {
    private info: InfoObject = {
        title: 'API Documentation',
        version: '1.0.0',
    };
    private readonly internalSchemas = {
        'class String': {
            type: 'string',
        },
        'class Boolean': {
            type: 'boolean',
        },
        'class Number': {
            type: 'number',
        },
        'class BigInt': {
            type: 'number',
        },
        'class Date': {
            type: 'string',
            format: 'date-time',
        },
        'class Object': {
            type: 'object',
        },
        null: {
            type: 'null',
        },
        undefined: {
            type: 'null',
        },
    };
    private readonly document: OpenAPIObject = {
        openapi: '3.0.0',
        info: this.info,
        paths: {},
        components: {
            schemas: {},
        },
    };

    public constructor(private readonly options: OpenApiUtilOptions) {
        this.info = {
            ...this.info,
            ...options?.info,
        };
    }

    public generateDocument() {
        Object.entries(this.generateComponentSchemas()).forEach(([key, schema]) => {
            this.document.components.schemas[key] = schema;
        });

        const controllerClazzList = NestUtil.getControllerClasses(this.options?.Clazz);
        controllerClazzList.forEach((controllerClazz) => {
            const controllerReflection = reflect(controllerClazz);
            const methodNameList = Object
                .getOwnPropertyNames(controllerClazz.prototype)
                .filter((name) => name !== 'constructor')
                .filter((methodName) => controllerReflection?.getMethod?.(methodName)?.isPublic);
            const controllerPrefix = Reflect.getMetadata(METADATA_NAMES.CONTROLLER_PREFIX, controllerClazz);

            methodNameList.forEach((methodName) => {
                let scopeNames = Reflect.getMetadata(METADATA_NAMES.METHOD_SCOPE_NAMES, controllerClazz, methodName);

                if (!Array.isArray(scopeNames)) {
                    return;
                }

                scopeNames = scopeNames.filter((scopeName) => !StringUtil.isFalsyString(scopeName));

                if (scopeNames.length === 0) {
                    return;
                }

                const reflectedBodyIndex = Reflect.getMetadata(ReflectedBody.metadataKey, controllerClazz, methodName);
                const responseSchema = this.generateResponseSchema(controllerReflection.getMethod?.(methodName)?.returnType?.toString());
                let requestSchema: SchemaObject & Partial<ReferenceObject>;

                if (reflectedBodyIndex >= 0) {
                    requestSchema = this.generateSchema(
                        controllerReflection.getMethod?.(methodName)?.parameterTypes?.[reflectedBodyIndex]?.toString?.(),
                        'request',
                    );
                }

                scopeNames.forEach((scopeName) => {
                    const actualPathname = `${controllerPrefix}/${scopeName}`;

                    if (requestSchema) {
                        _.set(this.document, `paths.["${actualPathname}"].post.requestBody.content`, {
                            'application/json': {
                                schema: requestSchema,
                            },
                        });
                    }

                    _.set(this.document, `paths.["${actualPathname}"].post.responses`, {
                        200: {
                            description: 'Success',
                            content: {
                                'application/json': {
                                    schema: responseSchema,
                                },
                            },
                        },
                    });
                });
            });
        });

        return this.document;
    }

    private generateSchema(input: string, scene: 'request' | 'response'): SchemaObject & Partial<ReferenceObject> {
        if (input === 'unknown' || input === 'any') {
            return {
                type: 'object',
            };
        }

        if (StringUtil.isFalsyString(input) || !/^class\s\w+(?:\[\])*$/.test(input)) {
            throw CommonExceptionUtil.create(CommonExceptionUtil.Code.INVALID_INFERRED_TYPE, {
                type: input,
            });
        }

        if (input.endsWith('[]')) {
            return {
                type: 'array',
                items: this.generateSchema(input.slice(0, -2), scene),
            };
        } else {
            if (['null', 'undefined'].includes(input)) {
                return { ...this.internalSchemas[input] };
            }

            const className = input.replace(/^class\s/g, '');

            if (Object.keys(this.internalSchemas).includes(input)) {
                return { ...this.internalSchemas[input] };
            }

            const postfix = (() => {
                switch (scene) {
                    case 'request':
                        return 'Request';
                    case 'response':
                        return 'Response';
                }
            })();

            return {
                $ref: getSchemaPath(`${className}.${postfix}`),
            };
        }
    }

    private generateResponseSchema(input: string): ReturnType<typeof this.generateSchema> {
        let finalInput = input;
        finalInput = /^class\sPromise\<(.+)\>/.exec(finalInput)?.[1] ?? finalInput;
        finalInput = new RegExp('^class PaginationResultDTO<(.+)>').exec(finalInput)?.[1] ?? finalInput;
        const basicSchema = this.generateSchema(finalInput, 'response');
        return {
            allOf: [
                {
                    $ref: getSchemaPath('ResponseDTO.Response'),
                },
                {
                    properties: {
                        data: {
                            type: 'array',
                            items: basicSchema,
                        },
                    },
                },
            ],
        };
    }

    private generateComponentSchemas() {
        const generateSchema = (mappingMetadata: MappingMetadata, Clazz: ClassType, scene: 'request' | 'response') => {
            const postfix = (() => {
                switch (scene) {
                    case 'request':
                        return 'Request';
                    case 'response':
                        return 'Response';
                }
            })();
            return {
                type: 'object',
                properties: mappingMetadata.reduce((result, [propertyKey, options]) => {
                    const groups = options?.groups;
                    let propertyType = reflect(Clazz).getProperty?.(propertyKey)?.type?.toString?.();

                    if (StringUtil.isFalsyString(propertyType)) {
                        return result;
                    }

                    propertyType = propertyType.replace(/(\[\])+$/, '');

                    switch (scene) {
                        case 'request': {
                            if (Array.isArray(groups) && !groups.includes(GROUP.REQUEST_ONLY)) {
                                return result;
                            } else {
                                break;
                            }
                        }
                        case 'response': {
                            if (Array.isArray(groups) && !groups.includes(GROUP.RESPONSE_ONLY)) {
                                return result;
                            } else {
                                break;
                            }
                        }
                    }

                    if (Object.keys(this.internalSchemas).includes(propertyType)) {
                        result[propertyKey] = this.internalSchemas[propertyType];
                    } else {
                        const className = /^class\s(\w+)/.exec(propertyType)?.[1];
                        result[propertyKey] = {
                            $ref: getSchemaPath(`${className}.${postfix}`),
                        };
                    }

                    return result;
                }, {} as Record<string, SchemaObject | Partial<ReferenceObject>>),
            } as SchemaObject;
        };

        const result = Object
            .entries(ApiController.getModelMap())
            .reduce((result, [key, Clazz]) => {
                const mappingMetadata = Reflect.getMetadata(Mapping.metadataKey, Clazz.prototype);

                if (!Array.isArray(mappingMetadata)) {
                    return result;
                }

                result[`${key}.Request`] = generateSchema(mappingMetadata, Clazz, 'request');
                result[`${key}.Response`] = generateSchema(mappingMetadata, Clazz, 'response');

                return result;
            }, {} as Record<string, SchemaObject>);

        return result;
    }
}
