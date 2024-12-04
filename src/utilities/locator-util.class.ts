/* eslint-disable prefer-object-has-own */
import * as _ from 'lodash';
import { Locator } from '../decorators/locator.decorator';
import { JSONUtil } from './json-util.class';
import { CommonExceptionUtil } from './common-exception-util.class';
import { ClassType } from '../types/class-type.type';
import { StringUtil } from './string-util.class';
import { Correlate } from '../decorators/correlate.decorator';

export class LocatorUtil {
    public static parse<T>(ClassType: ClassType<T>, rawValue: string, throwError = true): {
        notAllowedFields: string[];
        result: Record<string, string | number | boolean | null>;
    } {
        const locatorValue = JSONUtil.parse(rawValue);

        if (!_.isPlainObject(locatorValue) || !ClassType?.prototype) {
            if (throwError) {
                throw CommonExceptionUtil.create(
                    CommonExceptionUtil.Code.INVALID_PARAMS,
                    {
                        params: ['locator'],
                    },
                );
            }
            return {
                result: null,
                notAllowedFields: [],
            };
        }

        const allowedLocatorFields = Reflect.getMetadata(Locator.metadataKey, ClassType?.prototype);
        const notAllowedFields: string[] = [];

        if (!Array.isArray(allowedLocatorFields) || allowedLocatorFields.length === 0) {
            return {
                result: {},
                notAllowedFields: Object.keys(locatorValue),
            };
        }

        const returnResult: Record<string, string | number | boolean | null> = {};

        Object.keys(locatorValue).forEach((key) => {
            if (StringUtil.isFalsyString(key)) {
                return;
            }

            if (key.indexOf('.') === -1) {
                const matchedField = allowedLocatorFields.find((field) => field?.[0] === key);
                if (!matchedField) {
                    notAllowedFields.push(key);
                    return;
                }
                returnResult[StringUtil.isFalsyString(matchedField?.[1]) ? matchedField[0] : matchedField[1]] = locatorValue[key];
            }

            if (key.indexOf('.') !== -1) {
                const finalPathSegments = key.split('.');
                let TargetClassType = ClassType;

                for (const [pathSegmentIndex, pathSegment] of finalPathSegments.entries()) {
                    if (!TargetClassType) {
                        notAllowedFields.push(key);
                        return;
                    }

                    const allowedSubLocatorFields = Reflect.getMetadata(Locator.metadataKey, TargetClassType?.prototype);
                    const matchedField = allowedSubLocatorFields.find((field) => field?.[0] === pathSegment);

                    if (!Array.isArray(allowedSubLocatorFields) || !matchedField) {
                        notAllowedFields.push(key);
                        return;
                    }

                    const correlateMapArray = Reflect.getMetadata(Correlate.metadataKey, TargetClassType?.prototype);
                    const targetClassTypeFactory = correlateMapArray?.find?.((item) => item?.[0] === pathSegment)?.[1];

                    if (!StringUtil.isFalsyString(matchedField?.[1])) {
                        finalPathSegments[pathSegmentIndex] = matchedField?.[1];
                    }

                    if (pathSegmentIndex === finalPathSegments.length - 1) {
                        break;
                    }

                    if (typeof targetClassTypeFactory !== 'function') {
                        notAllowedFields.push(key);
                        return;
                    }

                    TargetClassType = targetClassTypeFactory();
                }

                returnResult[finalPathSegments.join('.')] = locatorValue[key];
            }
        });

        if (notAllowedFields.length > 0 && throwError) {
            throw CommonExceptionUtil.create(CommonExceptionUtil.Code.INVALID_PARAMS, {
                params: notAllowedFields.map((fieldName) => `locator:${fieldName}`),
            });
        }

        return {
            result: Object.entries(returnResult).reduce((currentResult, [key, value]) => {
                currentResult[key.includes('.') ? `$${key}$` : key] = value;
                return currentResult;
            }, {}),
            notAllowedFields,
        };
    }

    public static validate(ClassType: ClassType<any>, locator: string) {
        const parseResult = LocatorUtil.parse(ClassType, locator, false);
        return parseResult.notAllowedFields.length === 0 && parseResult.result !== null;
    }
}

// import { InvocationDTO } from '../../dist/dtos/invocation.dto.class';
// import { InvocationDAO } from '../daos/invocation.dao.class';
// console.log(
//     LocatorUtil.parse(
//         InvocationDAO,
//         JSON.stringify({
//             id: '1281f322-3c10-463b-b59a-ae5f9ef9ec9e',
//             'node.userNodeRelations.userId': '5c561e23-ffcf-4b90-aada-330d32f4a1e1',
//             'node.collection.userCollectionRelations.userId': '5c561e23-ffcf-4b90-aada-330d32f4a1e1',
//         }),
//         false,
//     ),
// );
