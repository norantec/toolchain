import * as _ from 'lodash';
import { OpenAPIObject } from '@nestjs/swagger';
import { BumpType } from '../bump/bump.command.class';
import { StringUtil } from '../../utilities/string-util.class';
import * as semver from 'semver';
import { InferType } from 'yup';
import { SCHEMA } from './open-api.constants';
import { ReferenceObject, SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

export interface OpenApiGeneratorOptions extends InferType<typeof SCHEMA> {
    document: OpenAPIObject;
}

export type GenerateResult = Record<string, string>;

export class OpenApiGenerator {
    public constructor(private readonly options: OpenApiGeneratorOptions) {
        if (
            !_.isObjectLike(options?.document) ||
            StringUtil.isFalsyString(options?.packageName) ||
            StringUtil.isFalsyString(options?.packageVersion) ||
            StringUtil.isFalsyString(semver.valid(options?.packageVersion)) ||
            !Object.values(BumpType).includes(options?.bumpType)
        ) {
            throw new Error('Invalid options');
        }
    }

    public async generate() {
        console.log(this.generateComponents('DataTypeMap', this.options?.document?.components?.schemas));
    }

    private generateComponents(
        mapInterfaceIdentifier: string,
        schemas: Record<string, SchemaObject | ReferenceObject>,
    ) {
        if (!_.isObjectLike(schemas) || StringUtil.isFalsyString(mapInterfaceIdentifier)) return;
        const generatedComponents = Object.entries(schemas)
            .reduce((result: string[], [key, schemaItem]) => {
                const componentLines = this.generateComponent(mapInterfaceIdentifier, schemaItem);
                return result.concat(`'${key}': ${componentLines.shift()}`).concat(...componentLines);
            }, [] as string[])
            .map((item) => `    ${item}`);
        return [`export interface ${mapInterfaceIdentifier} {`, ...generatedComponents, '};'].join('\n');
    }

    private generateComponent(mapInterfaceIdentifier: string, schema: SchemaObject | ReferenceObject): string[] {
        if (!StringUtil.isFalsyString((schema as ReferenceObject)?.$ref)) {
            return [(schema as ReferenceObject).$ref.split('/').pop()];
        }

        if ((schema as SchemaObject).type === 'object' && _.isObjectLike((schema as SchemaObject)?.properties)) {
            const fields = Object.entries((schema as SchemaObject).properties).reduce(
                (result: string[], [key, value]) => {
                    if (!StringUtil.isFalsyString((value as ReferenceObject)?.$ref)) {
                        return result.concat(
                            `${key}?: ${mapInterfaceIdentifier}['${(value as ReferenceObject).$ref.split('/').pop()}'];`,
                        );
                    }

                    switch ((value as SchemaObject)?.type) {
                        case 'string':
                        case 'number':
                        case 'integer': {
                            const formatSchema = (value as SchemaObject)?.format;
                            const enumSchema = (value as SchemaObject)?.enum;

                            if (['date', 'date-time'].includes(formatSchema)) {
                                return result.concat(`${key}?: Date;`);
                            } else if (Array.isArray(enumSchema) && enumSchema.length > 0) {
                                return result.concat(
                                    [
                                        `${key}?: `,
                                        enumSchema
                                            .map((enumSchemaItem) => {
                                                return (value as SchemaObject)?.type === 'string'
                                                    ? JSON.stringify(enumSchemaItem)
                                                    : enumSchemaItem;
                                            })
                                            .join(' | '),
                                        ';',
                                    ].join(''),
                                );
                            } else {
                                return result.concat(
                                    `${key}?: ${(value as SchemaObject)?.type === 'string' ? 'string' : 'number'};`,
                                );
                            }
                        }
                        case 'array': {
                            const itemsSchema = (value as SchemaObject).items;
                            const itemsComponent = this.generateComponent(mapInterfaceIdentifier, itemsSchema);
                            const finalItemsComponent = !StringUtil.isFalsyString(itemsComponent)
                                ? itemsComponent
                                : JSON.stringify(itemsComponent, null, 4);
                            result[key] = `Array<${finalItemsComponent}>`;
                            break;
                        }
                        default: {
                            result[key] = (value as SchemaObject)?.type;
                            break;
                        }
                    }

                    return result;
                },
                [] as string[],
            );
            return ['{', ...fields.map((field) => `    ${field}`), '};'];
        }

        return ['never;'];
    }
}
