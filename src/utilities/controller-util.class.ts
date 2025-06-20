/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import 'reflect-metadata';
import { Controller as NestController, UseGuards } from '@nestjs/common';
import { SystemHeadGuard } from '../guards/system-head.guard';
import * as _ from 'lodash';
import { StringUtil } from './string-util.class';
import { Constructor } from 'type-fest';

export interface Options {
    prefix?: string;
    useHeadGuards?: Constructor<any>[];
    useTailGuards?: Constructor<any>[];
}

export interface ControllerUtilCreateOptions {
    prefix?: string;
    useGuards?: Constructor<any>[];
}

export const IS_CONTROLLER = Symbol();

export class ControllerUtil {
    public static create(createOptions?: ControllerUtilCreateOptions) {
        const Controller = (options?: Options): ClassDecorator => {
            return (target) => {
                let finalPrefix: string = StringUtil.isFalsyString(options?.prefix)
                    ? StringUtil.isFalsyString(createOptions?.prefix)
                        ? ''
                        : createOptions!.prefix!
                    : options!.prefix!;
                finalPrefix += `/${_.camelCase(target.name.replace(/Controller$/g, ''))}`;
                if (!finalPrefix.startsWith('/')) finalPrefix = `/${finalPrefix}`;
                Reflect.defineMetadata(IS_CONTROLLER, true, target.prototype);
                NestController(finalPrefix)(target);
                UseGuards(
                    SystemHeadGuard,
                    ...(Array.isArray(options?.useHeadGuards) ? options!.useHeadGuards : []),
                    ...(Array.isArray(createOptions?.useGuards) ? createOptions!.useGuards : []),
                    ...(Array.isArray(options?.useTailGuards) ? options!.useTailGuards : []),
                )(target);
            };
        };
        return Controller;
    }
}
