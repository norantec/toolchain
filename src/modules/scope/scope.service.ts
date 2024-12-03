import {
    Injectable,
    Type,
} from '@nestjs/common';
import { METADATA_NAMES } from '../../constants/metadata-names.constant';
import { StringUtil } from '../../utilities/string-util.class';

@Injectable()
export class ScopeService {
    public constructor(private readonly onLog?: (message: string) => void) {}

    public getAll(moduleClass: Type) {
        let importedModules: Type[] = Reflect.getMetadata('imports', moduleClass);

        if (!Array.isArray(importedModules)) {
            importedModules = [];
        }

        const scopes = this.getControllerClasses(moduleClass).reduce((result: string[], controllerClass) => {
            const currentControllerScopeNames = Reflect.getMetadata(METADATA_NAMES.SCOPE_NAMES, controllerClass);
            if (!Array.isArray(currentControllerScopeNames)) {
                return result;
            }
            return result.concat(currentControllerScopeNames.filter((item) => !StringUtil.isFalsyString(item)));
        }, []);

        this.onLog?.(`Got scopes: ${scopes.join(', ')}`);

        if (!Array.isArray(scopes)) {
            return [];
        }

        const filteredScopeNames = scopes.filter((item) => !StringUtil.isFalsyString(item));

        if (filteredScopeNames.length === 0) {
            return [];
        }

        return filteredScopeNames;
    }

    private getControllerClasses(moduleClass: Type) {
        let importedModules: Type[] = Reflect.getMetadata('imports', moduleClass);

        if (!Array.isArray(importedModules)) {
            importedModules = [];
        }

        return importedModules.reduce((result: Type[], ImportedModule) => {
            const controllerClasses = Reflect.getMetadata('controllers', ImportedModule);
            if (!Array.isArray(controllerClasses)) {
                return result;
            }
            return result.concat(controllerClasses);
        }, [] as Type[]);
    }
}
