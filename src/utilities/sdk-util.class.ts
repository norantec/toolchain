import * as _ from 'lodash';
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
import { OpenAPIDocument } from './open-api-util.class';

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
                'object-hash': '^3.0.0',
                'type-fest': '4.35.0',
            },
            devDependencies: {
                '@types/node': '^20.3.1',
                '@types/object-hash': '^3.0.6',
                typescript: '5.1.3',
            },
        },
        null,
        4,
    ),
    'bump.config.json': JSON.stringify({
        adapter: 'npm',
        options: {
            token: '{{env.NPM_TOKEN}}',
        },
    }),
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
const RESPONSE_TYPE_NAME = 'ClientResponse';
const OPTIONS_NAME = 'Options';
const REQUEST_OPTIONS_NAME = 'RequestOptions';
const CLIENT_RESPONSE_DATA_TYPE_NAME = 'ClientResponseData';
const CLIENT_REQUEST_BODY_TYPE_NAME = 'ClientRequestBody';

type TypeCustomizerFn = (dataTypeMapName: string, name: string, genericName: string) => string[];

export interface OpenApiGeneratorOptions extends InferType<typeof SCHEMA> {
    document: OpenAPIDocument;
    customizeRequestBodyType?: TypeCustomizerFn;
    customizeResponseDataType?: TypeCustomizerFn;
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

    private generateTypeCode(customizer: TypeCustomizerFn, dataTypeName: string): string[] {
        if (typeof customizer === 'function') {
            const customizedLines = customizer(DATA_TYPE_MAP_NAME, dataTypeName, 'T');
            if (
                !Array.isArray(customizedLines) ||
                customizedLines.filter((line) => !StringUtil.isFalsyString(line)).length === 0
            ) {
                throw new Error('Invalid cutomization of type');
            }
            return customizedLines;
        }
        return [`\nexport type ${dataTypeName}<T> = T;`];
    }

    private generateEnumCode(): string[] {
        if (
            !_.isPlainObject(this.options?.document?.enums) ||
            Object.keys(this.options?.document?.enums).length === 0
        ) {
            return [];
        }
        return [
            '\nexport namespace enums {',
            ...Object.entries(this.options.document.enums)
                .reduce((result: string[], [enumName, enumMethodMap]) => {
                    if (!_.isPlainObject(enumMethodMap) || Object.keys(enumMethodMap).length === 0) {
                        return result;
                    }
                    return result.concat([
                        `export namespace ${enumName} {`,
                        ...Object.entries(enumMethodMap)
                            .reduce((dtoMethodLines, [methodName, enumKeys]) => {
                                return dtoMethodLines.concat([
                                    `export enum ${methodName} {`,
                                    ...enumKeys.map(([enumKey, serializedEnumValue]) => {
                                        return `    ${enumKey?.startsWith?.('0') ? `'${enumKey}'` : enumKey} = ${serializedEnumValue},`;
                                    }),
                                    '}',
                                ]);
                            }, [] as string[])
                            .map((line) => `    ${line}`),
                        '}',
                    ]);
                }, [] as string[])
                .map((line) => `    ${line}`),
            '}',
        ];
    }

    private generateIndexCode() {
        const dataTypeMapCode = this.generateDataTypeMap(this.options?.document?.basic?.components?.schemas);
        const methodTypeMapCode = this.generateMethodTypeMap(this.options?.document?.basic?.paths);
        const requestBodyTypeAnnotation = `${CLIENT_REQUEST_BODY_TYPE_NAME}<${METHOD_TYPE_MAP_NAME}[T]['requestBody']>`;
        const responseDataTypeAnnotation = `${RESPONSE_TYPE_NAME}<${CLIENT_RESPONSE_DATA_TYPE_NAME}<${METHOD_TYPE_MAP_NAME}[T]['responseData']>>`;
        return [
            "import { PartialDeep } from 'type-fest';",
            "import { AxiosError as ClientError, AxiosRequestConfig } from 'axios';",
            "import axios from 'axios';",
            "import * as hash from 'object-hash';",
            '\nexport { ClientError };',
            `\n${dataTypeMapCode}`,
            `\n${methodTypeMapCode}`,
            `${this.generateEnumCode().join('\n')}`,
            ...this.generateTypeCode(this.options?.customizeRequestBodyType, CLIENT_REQUEST_BODY_TYPE_NAME),
            ...this.generateTypeCode(this.options?.customizeResponseDataType, CLIENT_RESPONSE_DATA_TYPE_NAME),
            '\ntype MethodTypeMapKeys = keyof MethodTypeMap;',
            '\ntype MethodResponseData = {',
            '    [K in MethodTypeMapKeys]: {',
            '        url: K;',
            '    } & { response: MethodTypeMap[K][\'response\']; };',
            '}[MethodTypeMapKeys];',
            `\nexport interface ${OPTIONS_NAME} extends Partial<AxiosRequestConfig> {`,
            '    getAuthorizationCredential?: () => string;',
            '    onResponse?: (response: MethodResponseData) => void | Promise<void>;',
            '}',
            `\nexport interface ${RESPONSE_TYPE_NAME}<T> {`,
            '    error?: ClientError;',
            `    response?: T;`,
            '}',
            `\nexport interface ${REQUEST_OPTIONS_NAME} {`,
            '    ignoreCache?: boolean;',
            '}',
            '\nexport class Client {',
            `    public constructor(private readonly options: ${OPTIONS_NAME} = {}) {}`,
            `\n    protected readonly REQUEST_METHOD_MAP = new Map<keyof ${METHOD_TYPE_MAP_NAME}, (...params: any[]) => Promise<unknown>>();`,
            `\n    protected readonly RESPONSE_CACHE_MAP = new Map<string, ${RESPONSE_TYPE_NAME}<${CLIENT_RESPONSE_DATA_TYPE_NAME}<unknown>>>();`,
            `\n    public createRequest<T extends keyof ${METHOD_TYPE_MAP_NAME}>(url: T): (requestBody?: ${requestBodyTypeAnnotation}, options?: ${REQUEST_OPTIONS_NAME}) => Promise<${responseDataTypeAnnotation}> {`,
            "        if (typeof this.REQUEST_METHOD_MAP.get(url) !== 'function') {",
            `            this.REQUEST_METHOD_MAP.set(url, (requestBody?: ${requestBodyTypeAnnotation}, options?: ${REQUEST_OPTIONS_NAME}) => this.request.call(this, url, requestBody, options));`,
            '        }',
            `        return this.REQUEST_METHOD_MAP.get(url) as (requestBody?: ${requestBodyTypeAnnotation}, options?: ${REQUEST_OPTIONS_NAME}) => Promise<${responseDataTypeAnnotation}>;`,
            '    }',
            `\n    public async request<T extends keyof ${METHOD_TYPE_MAP_NAME}>(url: T, requestBody?: ${requestBodyTypeAnnotation}, options?: ${REQUEST_OPTIONS_NAME}): Promise<${responseDataTypeAnnotation}> {`,
            '        const requestHash = hash(requestBody ?? null);',
            '        if (this.RESPONSE_CACHE_MAP.has(requestHash) && !options?.ignoreCache) {',
            '            return this.RESPONSE_CACHE_MAP.get(requestHash);',
            '        }',
            '        const { getAuthorizationCredential, onResponse, ...axiosOptions } = this?.options;',
            '        const credential = getAuthorizationCredential?.();',
            '        const result = await axios.post(url, requestBody, {',
            '            ...axiosOptions,',
            '            headers: {',
            '                ...axiosOptions?.headers,',
            "                Authorization: (typeof credential === 'string' && credential.length > 0) ? credential : this?.options?.headers?.Authorization,",
            '            },',
            '        }).then((response) => ({ error: null, response: response?.data })).catch((error) => ({ error, response: null }));',
            '        onResponse?.(result?.response as unknown as MethodResponseData);',
            '        this.RESPONSE_CACHE_MAP.set(requestHash, result);',
            '        return result;',
            '    }',
            '}\n',
        ].join('\n');
    }

    private generateDataTypeMap(schemas: Record<string, SchemaObject | ReferenceObject>) {
        if (!_.isObjectLike(schemas) || StringUtil.isFalsyString(DATA_TYPE_MAP_NAME)) return;
        const generatedComponents = Object.entries(schemas)
            .reduce((result: string[], [componentName, schema]) => {
                const componentLines = Object.entries((schema as SchemaObject).properties).reduce(
                    (componentResult: string[], [identifier, subSchema]) => {
                        return componentResult.concat(
                            `    ${identifier}?: ${this.generateSchemaType(componentName, identifier, subSchema)};`,
                        );
                    },
                    [] as string[],
                );
                return result.concat([`'${componentName}': {`, ...componentLines, '};']);
            }, [] as string[])
            .map((item) => `    ${item}`);
        return [`export interface ${DATA_TYPE_MAP_NAME} {`, ...generatedComponents, '};'].join('\n');
    }

    private generateSchemaType(
        componentName: string,
        identifier: string,
        schema: SchemaObject | ReferenceObject,
    ): string {
        if ((schema as SchemaObject)?.type === 'array') {
            return `Array<${this.generateSchemaType(componentName, identifier, (schema as SchemaObject).items)}>`;
        }

        if (!StringUtil.isFalsyString((schema as ReferenceObject)?.$ref)) {
            return `${DATA_TYPE_MAP_NAME}['${(schema as ReferenceObject).$ref.split('/').pop()}']`;
        }

        switch ((schema as SchemaObject)?.type) {
            case 'string':
            case 'number':
            case 'integer': {
                const formatSchema = (schema as SchemaObject)?.format;
                const enumSchema = (schema as SchemaObject)?.enum;

                if (['date', 'date-time'].includes(formatSchema)) {
                    return 'Date';
                } else if (Array.isArray(enumSchema) && enumSchema.length > 0) {
                    return `enums.${componentName.split('.').slice(0, -1).join('.')}.${identifier}`;
                } else {
                    return (schema as SchemaObject)?.type === 'string' ? 'string' : 'number';
                }
            }
            case 'boolean': {
                return (schema as SchemaObject)?.type;
            }
            default:
                return 'never';
        }
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
