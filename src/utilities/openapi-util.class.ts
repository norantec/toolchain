import { getSchemaPath } from '@nestjs/swagger';
import {
    OpenAPIObject,
    ReferenceObject,
    SchemaObject,
} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { ResponseDTO } from '../dtos/response.dto.class';
import { PaginationResultDTO } from '../dtos/pagination-result.dto.class';
import { ClassType } from '../types/class-type.type';
import { NestUtil } from './nest-util.class';
import { reflect } from 'typescript-rtti';
import { METADATA_NAMES } from '../constants/metadata-names.constant';
import { StringUtil } from './string-util.class';
import { ReflectedBody } from '../decorators/reflected-body.decorator';
import * as _ from 'lodash';
import { Models } from '../decorators/models.decorator';
import { CommonExceptionUtil } from './common-exception-util.class';

function generateBasicSchemaAndType(input: string): {
    Clazz: ClassType;
    schema: SchemaObject & Partial<ReferenceObject>;
} {
    if (StringUtil.isFalsyString(input) || !/^class\s\w+(?:\[\])*$/.test(input)) {
        throw CommonExceptionUtil.create(CommonExceptionUtil.Code.INVALID_INFERRED_TYPE, {
            type: input,
        });
    }

    if (input.endsWith('[]')) {
        return {
            schema: {
                type: 'array',
                items: generateBasicSchemaAndType(input.slice(0, -2))?.schema,
            },
            Clazz: null,
        };
    } else {
        const className = input.replace(/^class\s/g, '');
        const Clazz = Models.get(className);

        if (!Clazz) {
            throw CommonExceptionUtil.create(CommonExceptionUtil.Code.INVALID_UNREGISTERED_CLASS, {
                className,
            });
        }

        return {
            schema: {
                $ref: getSchemaPath(className),
            },
            Clazz,
        };
    }
}

export class OpenApiUtil {
    /**
     * @param input something like class A[][][]
     * @returns
     */
    public static generateRequestBodySchemaAndClassName = generateBasicSchemaAndType;

    /**
     * @param input something like class A[][][]
     * @returns
     */
    public static generateResponseSchemaAndClassName(rawInput: string): ReturnType<typeof generateBasicSchemaAndType> {
        let input = rawInput;
        input = /^class\sPromise\<(.+)\>/.exec(input)?.[1] ?? input;
        input = new RegExp(`^class ${PaginationResultDTO.name}<(.+)>`).exec(input)?.[1] ?? input;
        const basicSchemaAndType = generateBasicSchemaAndType(input);
        return {
            schema: {
                $ref: getSchemaPath(ResponseDTO),
                properties: {
                    data: {
                        type: 'array',
                        items: basicSchemaAndType.schema,
                    },
                },
            },
            Clazz: basicSchemaAndType.Clazz,
        };
    }

    public static patchDocument(document: OpenAPIObject, Clazz: ClassType) {
        const controllerClazzList = NestUtil.getControllerClasses(Clazz);
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
                const { schema: responseSchema } = OpenApiUtil.generateResponseSchemaAndClassName(controllerReflection.getMethod?.(methodName)?.returnType?.toString());
                let requestSchema: SchemaObject & Partial<ReferenceObject>;

                if (reflectedBodyIndex >= 0) {
                    requestSchema = OpenApiUtil.generateRequestBodySchemaAndClassName(controllerReflection.getMethod?.(methodName)?.parameterTypes?.[reflectedBodyIndex]?.toString?.()).schema;
                }

                scopeNames.forEach((scopeName) => {
                    const actualPathname = `${controllerPrefix}/${scopeName}`;

                    if (requestSchema) {
                        _.set(document, `paths.["${actualPathname}"].post.requestBody.content`, {
                            'application/json': {
                                schema: requestSchema,
                            },
                        });
                    }

                    _.set(document, `paths.["${actualPathname}"].post.responses.201.content`, {
                        'application/json': {
                            schema: responseSchema,
                        },
                    });
                });
            });
        });
    }
}
