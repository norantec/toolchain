import { getSchemaPath } from '@nestjs/swagger';
import {
    ReferenceObject,
    SchemaObject,
} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { ResponseDTO } from '../dtos/response.dto.class';
import { PaginationResultDTO } from '../dtos/pagination-result.dto.class';
import { ContainerUtil } from './container-util.class';
import { ClassType } from '../types/class-type.type';

function generateBasicSchemaAndType(input: string): {
    Clazz: ClassType;
    schema: SchemaObject & Partial<ReferenceObject>;
} {
    // if (StringUtil.isFalsyString(input) || !/^class\s\w+(?:\[\])*$/.test(input)) {
    //     throw CommonExceptionUtil.create(CommonExceptionUtil.Code.INVALID_INFERRED_TYPE, {
    //         type: input,
    //     });
    // }
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
        const Clazz = ContainerUtil.get(className);

        // if (!Clazz) {
        //     throw CommonExceptionUtil.create(CommonExceptionUtil.Code.INVALID_UNREGISTERED_CLASS, {
        //         className,
        //     });
        // }

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
    public static generateSchemaAndClassName(rawInput: string): ReturnType<typeof generateBasicSchemaAndType> {
        let input = rawInput;
        input = /^class\sZoneAwarePromise\<(.+)\>/.exec(input)?.[1] ?? input;
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
}
