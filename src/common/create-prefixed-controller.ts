/* eslint-disable @typescript-eslint/no-invalid-this */
import {
    Controller,
    ControllerOptions,
} from '@nestjs/common';

export function createPrefixedPathController(prefix: string) {
    const addPrefix = (pathname: string, prefix: string) => {
        const MAJOR_VERSION = '1';
        const prefixWithVersioning = prefix + (prefix?.endsWith('/') ? '' : '/') + `v${MAJOR_VERSION}`;
        return typeof pathname === 'string'
            ? `${prefixWithVersioning}${pathname.startsWith('/') ? '' : '/'}${pathname}`
            : typeof pathname === 'undefined'
                ? prefixWithVersioning
                : pathname;
    };
    const modifyControllerArgument = (argument, prefix: string) => {
        let newArgument;

        if (typeof argument === 'string') {
            newArgument = addPrefix(argument, prefix);
        } else if (Array.isArray(argument)) {
            newArgument = argument.map((argumentItem) => addPrefix(argumentItem, prefix));
        } else if ((argument as ControllerOptions)?.path) {
            newArgument = modifyControllerArgument((argument as ControllerOptions)?.path, prefix);
        } else if (typeof argument === 'undefined') {
            return addPrefix(argument, prefix);
        } else {
            return argument;
        }

        return newArgument;
    };

    return function(argument?: Omit<ControllerOptions, 'path'>) {
        return Controller.call(this, modifyControllerArgument(argument, prefix));
    };
};
