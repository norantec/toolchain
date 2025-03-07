/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import 'reflect-metadata';
import { Controller, UseGuards } from '@nestjs/common';
import { METADATA_NAMES } from '../constants/metadata-names.constant';
import { AuthGuard } from '@nestjs/passport';
import { SystemHeadGuard } from '../guards/system-head.guard';
import * as _ from 'lodash';
import { StringUtil } from './string-util.class';
import { Method } from '../decorators/method.decorator';

export interface ApiControllerOptions {
    allowedAuthAdapters?: string[] | boolean;
    version?: number;
}

export interface ApiControllerUtilCreateOptions {
    headGuards?: Function[];
    tailGuards?: Function[];
}

export class ApiControllerUtil {
    public static create(createOptions?: ApiControllerUtilCreateOptions) {
        const ApiController = (options?: ApiControllerOptions): ClassDecorator => {
            return (target) => {
                const finalPrefix = `/api/v${options?.version >= 1 ? options?.version : 1}`;
                const methodNames = Reflect.getMetadata(METADATA_NAMES.METHODS, target);
                const controllerAllowedAdapters = Method.normalizeAllowedAdapters(options?.allowedAuthAdapters);

                if (Array.isArray(methodNames) && Array.isArray(controllerAllowedAdapters)) {
                    methodNames.forEach((methodName) => {
                        if (StringUtil.isFalsyString(methodName)) return;

                        const methodAllowedAuthAdapters: string[] | boolean = Reflect.getMetadata(
                            METADATA_NAMES.METHOD_AUTH_ADAPTERS,
                            target,
                            methodName,
                        );

                        if (methodAllowedAuthAdapters === false) return;

                        if (Array.isArray(methodAllowedAuthAdapters)) {
                            Reflect.defineMetadata(
                                METADATA_NAMES.METHOD_AUTH_ADAPTERS,
                                _.uniq(controllerAllowedAdapters.concat(methodAllowedAuthAdapters)),
                                target,
                                methodName,
                            );
                        } else if (methodAllowedAuthAdapters === true) {
                            Reflect.defineMetadata(
                                METADATA_NAMES.METHOD_AUTH_ADAPTERS,
                                controllerAllowedAdapters,
                                target,
                                methodName,
                            );
                        }
                    });
                }

                Reflect.defineMetadata(METADATA_NAMES.CONTROLLER_PREFIX, finalPrefix, target);
                Controller(finalPrefix)(target);
                UseGuards(
                    SystemHeadGuard,
                    ...(Array.isArray(createOptions?.headGuards) ? createOptions?.headGuards : []),
                    ...(controllerAllowedAdapters === false ? [] : [AuthGuard('auth')]),
                    ...(Array.isArray(createOptions?.tailGuards) ? createOptions?.tailGuards : []),
                )(target);
            };
        };

        return ApiController;
    }
}
