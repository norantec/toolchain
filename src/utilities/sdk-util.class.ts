import * as _ from 'lodash';
import { OpenAPIObject } from '@nestjs/swagger';
import { InferType } from 'yup';
import {
    PathsObject,
    ReferenceObject,
    RequestBodyObject,
    ResponseObject,
    SchemaObject,
} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import * as yup from 'yup';
import * as Handlebars from 'handlebars';
import * as fs from 'fs-extra';
import * as path from 'path';
import { StringUtil } from './string-util.class';

const templateFiles = {
    'package.json': JSON.stringify(
        {
            name: '{{packageName}}',
            version: '{{packageVersion}}',
            scripts: {
                build: 'tsc',
            },
            author: {
                name: '{{authorName}}',
                email: '{{authorEmail}}',
            },
            main: 'dist/index.js',
            files: ['dist'],
            publishConfig: {
                registry: '{{registry}}',
                access: 'public',
            },
            dependencies: {
                axios: '1.7.9',
                'type-fest': '4.35.0',
            },
            devDependencies: {
                '@types/node': '^20.3.1',
                typescript: '5.1.3',
            },
        },
        null,
        4,
    ),
    'tsconfig.json': JSON.stringify(
        {
            compilerOptions: {
                module: 'CommonJS',
                declaration: true,
                removeComments: true,
                emitDecoratorMetadata: true,
                experimentalDecorators: true,
                allowSyntheticDefaultImports: true,
                target: 'es2017',
                sourceMap: false,
                outDir: './dist',
                incremental: true,
                skipLibCheck: true,
                strictNullChecks: false,
                noImplicitAny: false,
                strictBindCallApply: false,
                types: ['node'],
                typeRoots: ['node_modules/@types', 'typings'],
                moduleResolution: 'node',
                forceConsistentCasingInFileNames: false,
                noFallthroughCasesInSwitch: false,
            },
            exclude: ['node_modules', 'test', 'dist', '**/*spec.ts'],
        },
        null,
        4,
    ),
};

export const SCHEMA = yup.object({
    authorEmail: yup.string().optional(),
    authorName: yup.string().optional(),
    packageName: yup.string().required(),
    registry: yup.string().optional().default('https://registry.npmjs.org'),
});

const DATA_TYPE_MAP_NAME = 'DataTypeMap';
const METHOD_TYPE_MAP_NAME = 'MethodTypeMap';
const RESPONSE_TYPE_NAME = 'AxiosResponse';

export interface OpenApiGeneratorOptions extends InferType<typeof SCHEMA> {
    document: OpenAPIObject;
}

export type GenerateResult = Record<string, string>;

export class SDKUtil {
    public constructor(private readonly options: OpenApiGeneratorOptions) {
        if (!_.isObjectLike(options?.document) || StringUtil.isFalsyString(options?.packageName)) {
            throw new Error('Invalid options');
        }
    }

    public generate() {
        const result = Object.entries(templateFiles).reduce(
            (accumulator, [pathname, templateContent]) => {
                accumulator[pathname] = Handlebars.compile(templateContent, { noEscape: true })({
                    packageName: this.options.packageName,
                    packageVersion: fs.readJsonSync(path.resolve('package.json'))?.version,
                    authorName: this.options.authorName || '',
                    authorEmail: this.options.authorEmail || '',
                });
                return accumulator;
            },
            {} as Record<string, string>,
        );

        result['src/index.ts'] = this.generateIndexCode();

        return result;
    }

    private generateIndexCode() {
        const dataTypeMapCode = this.generateDataTypeMap(this.options?.document?.components?.schemas);
        const methodTypeMapCode = this.generateMethodTypeMap(this.options?.document?.paths);
        return [
            "import { PartialDeep } from 'type-fest';",
            "import { AxiosResponse, AxiosRequestConfig } from 'axios';",
            "import axios from 'axios';",
            `\n${dataTypeMapCode}`,
            `\n${methodTypeMapCode}`,
            '\nexport interface Options extends Partial<AxiosRequestConfig> {',
            '    getAuthorizationCredential?: () => string;',
            '}',
            '\nexport class Client {',
            '    public constructor(private readonly options: Options = {}) {}',
            `\n    public async request<T extends keyof ${METHOD_TYPE_MAP_NAME}>(url: T, requestBody?: ${METHOD_TYPE_MAP_NAME}[T]['requestBody']): Promise<${RESPONSE_TYPE_NAME}<${METHOD_TYPE_MAP_NAME}[T]['responseData']>> {`,
            '        const { getAuthorizationCredential, ...axiosOptions } = this?.options;',
            '        const credential = getAuthorizationCredential?.();',
            '        return await axios.post(url, requestBody, {',
            '            ...axiosOptions,',
            '            headers: {',
            '                ...axiosOptions?.headers,',
            "                Authorization: (typeof credential === 'string' && credential.length > 0) ? credential : this?.options?.headers?.Authorization,",
            '            },',
            '        });',
            '    }',
            '}\n',
        ].join('\n');
    }

    private generateDataTypeMap(schemas: Record<string, SchemaObject | ReferenceObject>) {
        if (!_.isObjectLike(schemas) || StringUtil.isFalsyString(DATA_TYPE_MAP_NAME)) return;
        const generatedComponents = Object.entries(schemas)
            .reduce((result: string[], [key, schemaItem]) => {
                const componentLines = this.generateComponent(schemaItem);
                return result.concat(`'${key}': ${componentLines.shift()}`).concat(...componentLines);
            }, [] as string[])
            .map((item) => `    ${item}`);
        return [`export interface ${DATA_TYPE_MAP_NAME} {`, ...generatedComponents, '};'].join('\n');
    }

    private generateComponent(schema: SchemaObject | ReferenceObject): string[] {
        if (!StringUtil.isFalsyString((schema as ReferenceObject)?.$ref)) {
            return [(schema as ReferenceObject).$ref.split('/').pop()];
        }

        if ((schema as SchemaObject).type === 'object' && _.isObjectLike((schema as SchemaObject)?.properties)) {
            const fields = Object.entries((schema as SchemaObject).properties).reduce(
                (result: string[], [key, value]) => {
                    if (!StringUtil.isFalsyString((value as ReferenceObject)?.$ref)) {
                        return result.concat(
                            `${key}?: ${DATA_TYPE_MAP_NAME}['${(value as ReferenceObject).$ref.split('/').pop()}'];`,
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
                            const itemsComponent = this.generateComponent(itemsSchema);
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

    private generateMethodTypeMap(paths: PathsObject) {
        if (!_.isObjectLike(paths)) {
            return '';
        }

        const methodTypeMapLines = Object.entries(paths).reduce((result: string[], [key, value]) => {
            const responseDataTypeRef = (
                (
                    (value?.post?.responses?.['200'] as ResponseObject)?.content?.['application/json']
                        ?.schema as SchemaObject
                )?.items as ReferenceObject
            )?.$ref;

            if (!_.isObjectLike(value?.post) || StringUtil.isFalsyString(responseDataTypeRef)) {
                return result;
            }

            let requestArrayWrapperCount = 0;
            let requestBodySchema = (value.post.requestBody as RequestBodyObject)?.content?.['application/json']
                ?.schema;

            while ((requestBodySchema as SchemaObject)?.type === 'array') {
                requestArrayWrapperCount += 1;
                requestBodySchema = (requestBodySchema as SchemaObject).items;
            }

            return result.concat([
                `'${key.split('/').slice(-2).join('/')}': {`,
                ...(() => {
                    const ref = (requestBodySchema as ReferenceObject)?.$ref;
                    if (!StringUtil.isFalsyString(ref)) {
                        return [
                            `    requestBody?: PartialDeep<${DATA_TYPE_MAP_NAME}['${ref.split('/').pop()}']>${new Array(requestArrayWrapperCount).fill('[]').join('')};`,
                        ];
                    }
                    return [`    requestBody?: {};`];
                })(),
                `    responseData?: PartialDeep<${DATA_TYPE_MAP_NAME}['${responseDataTypeRef.split('/').pop()}']>;`,
                '};',
            ]);
        }, [] as string[]);

        return [
            `export interface ${METHOD_TYPE_MAP_NAME} {`,
            ...methodTypeMapLines.map((line) => `    ${line}`),
            '}',
        ].join('\n');
    }
}
