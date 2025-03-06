import { getSchemaPath } from '@nestjs/swagger';
import {
    InfoObject,
    OpenAPIObject,
    ReferenceObject,
    SchemaObject,
} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { NestUtil } from './nest-util.class';
import { reflect } from 'typescript-rtti/dist/lib/reflect';
import { METADATA_NAMES } from '../constants/metadata-names.constant';
import { ReflectedBody } from '../decorators/reflected-body.decorator';
import * as _ from 'lodash';
import { Mapping, MappingMetadata } from '../decorators/mapping.decorator';
import { GROUP } from '../constants/group.constant';
import { Constructor } from 'type-fest';
import { StringUtil } from './string-util.class';
import { ModelUtil } from './model-util.class';

interface OpenApiUtilOptions {
    Class: Constructor<any>;
    info?: InfoObject;
    scopeIdentifierBlacklist?: string[];
}

export enum ErrorCode {
    INVALID_INFERRED_TYPE = 'INVALID_INFERRED_TYPE',
    INVALID_ENUM_VALUE_TYPE = 'INVALID_ENUM_VALUE_TYPE',
}

export class OpenApiUtil {
    public static readonly internalSchemas = {
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
    private info: InfoObject = {
        title: 'API Documentation',
        version: '1.0.0',
    };
    private readonly document: OpenAPIObject = {
        openapi: '3.0.0',
        info: this.info,
        paths: {},
        components: {
            schemas: {},
        },
    };
    private readonly scopeIdentifierBlacklist = new Set<string>();

    public constructor(private readonly options: OpenApiUtilOptions) {
        this.info = {
            ...this.info,
            ...options?.info,
        };
        this.scopeIdentifierBlacklist.add('file.upload');
        if (Array.isArray(this.options?.scopeIdentifierBlacklist)) {
            this.options.scopeIdentifierBlacklist.forEach((blacklistedScopeIdentifier) => {
                this.scopeIdentifierBlacklist.add(blacklistedScopeIdentifier);
            });
        }
    }

    public generateDocument() {
        Object.entries(this.generateComponentSchemas()).forEach(([key, schema]) => {
            this.document.components.schemas[key] = schema;
        });

        const controllerClassList = NestUtil.getControllerClasses(this.options?.Class);
        controllerClassList.forEach((ControllerClass) => {
            const controllerReflection = reflect(ControllerClass);
            const methodNameList = Object.getOwnPropertyNames(ControllerClass.prototype)
                .filter((name) => name !== 'constructor')
                .filter((methodName) => controllerReflection?.getMethod?.(methodName)?.isPublic);
            const controllerPrefix = Reflect.getMetadata(METADATA_NAMES.CONTROLLER_PREFIX, ControllerClass);

            methodNameList.forEach((methodName) => {
                let scopeIdentifiers: string[] = Reflect.getMetadata(
                    METADATA_NAMES.METHOD_SCOPE_IDENTIFIERS,
                    ControllerClass,
                    methodName,
                );

                if (!Array.isArray(scopeIdentifiers)) {
                    return;
                }

                scopeIdentifiers = scopeIdentifiers.filter((scopeIdentifier) => {
                    return (
                        !StringUtil.isFalsyString(scopeIdentifier) &&
                        !this?.scopeIdentifierBlacklist?.has?.(scopeIdentifier)
                    );
                });

                if (scopeIdentifiers.length === 0) {
                    return;
                }

                const reflectedBodyIndex = Reflect.getMetadata(ReflectedBody.metadataKey, ControllerClass, methodName);
                const responseSchema = this.generateResponseSchema(
                    controllerReflection.getMethod?.(methodName)?.returnType?.toString(),
                );
                let requestSchema: SchemaObject & Partial<ReferenceObject>;

                if (reflectedBodyIndex >= 0) {
                    requestSchema = this.generateSchema(
                        controllerReflection
                            .getMethod?.(methodName)
                            ?.parameterTypes?.[reflectedBodyIndex]?.toString?.(),
                        'request',
                    );
                }

                scopeIdentifiers.forEach((scopeIdentifier) => {
                    const actualPathname = `${controllerPrefix}/${scopeIdentifier}`;

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
            throw new Error(
                `${ErrorCode.INVALID_INFERRED_TYPE}:${JSON.stringify({
                    type: input,
                })}`,
            );
        }

        if (input.endsWith('[]')) {
            return {
                type: 'array',
                items: this.generateSchema(input.slice(0, -2), scene),
            };
        } else {
            if (['null', 'undefined'].includes(input)) {
                return { ...OpenApiUtil.internalSchemas[input] };
            }

            const className = input.replace(/^class\s/g, '');

            if (Object.keys(OpenApiUtil.internalSchemas).includes(input)) {
                return { ...OpenApiUtil.internalSchemas[input] };
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
            type: 'array',
            items: basicSchema,
        };
    }

    private generateComponentSchemas() {
        const generateSchema = (
            mappingMetadata: MappingMetadata,
            Class: Constructor<any>,
            scene: 'request' | 'response',
        ) => {
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
                properties: mappingMetadata.reduce(
                    (result, [propertyKey, options]) => {
                        const groups = options?.groups;
                        let propertyType = reflect(Class).getProperty?.(propertyKey)?.type?.toString?.();

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

                        if (propertyType === 'enum') {
                            const enumValues = options?.enumValues;

                            if (!Array.isArray(enumValues) || enumValues.length === 0) {
                                throw new Error(ErrorCode.INVALID_ENUM_VALUE_TYPE);
                            }

                            const types = _.uniq(enumValues.map((enumValue) => typeof enumValue));

                            if (types.length > 1) {
                                throw new Error(ErrorCode.INVALID_ENUM_VALUE_TYPE);
                            }

                            result[propertyKey] = {
                                type: types[0],
                                enum: enumValues,
                            };
                        } else if (Object.keys(OpenApiUtil.internalSchemas).includes(propertyType)) {
                            result[propertyKey] = OpenApiUtil.internalSchemas[propertyType];
                        } else {
                            const className = /^class\s(\w+)/.exec(propertyType)?.[1];
                            result[propertyKey] = {
                                $ref: getSchemaPath(`${className}.${postfix}`),
                            };
                        }

                        return result;
                    },
                    {} as Record<string, SchemaObject | Partial<ReferenceObject>>,
                ),
            } as SchemaObject;
        };

        const result = Object.entries(ModelUtil.getModelMap()).reduce(
            (result, [key, Class]) => {
                const mappingMetadata = Reflect.getMetadata(Mapping.metadataKey, Class.prototype);

                if (!Array.isArray(mappingMetadata)) {
                    return result;
                }

                result[`${key}.Request`] = generateSchema(mappingMetadata, Class, 'request');
                result[`${key}.Response`] = generateSchema(mappingMetadata, Class, 'response');

                return result;
            },
            {} as Record<string, SchemaObject>,
        );

        return result;
    }
}
