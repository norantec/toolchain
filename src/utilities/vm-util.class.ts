import * as vm from 'node:vm';

export class VMUtil {
    public static runScriptCode(code: string, overrideContext?: Record<string, any>) {
        new vm.Script(code).runInContext(
            vm.createContext({
                ...global,
                __dirname,
                __filename,
                process,
                module,
                exports,
                require,
                ...overrideContext,
            }),
        );
    }
}
