import { ClassType } from '../types/class-type.type';
import * as _ from 'lodash';

export class NestUtil {
    public static getControllerClasses(Clazz: ClassType) {
        let importedModules: ClassType[] = Reflect.getMetadata('imports', Clazz);

        if (!Array.isArray(importedModules)) {
            importedModules = [];
        }

        return importedModules.reduce((result: ClassType[], ImportedModule) => {
            let controllerClasses = Reflect.getMetadata('controllers', ImportedModule);

            if (!Array.isArray(controllerClasses)) {
                controllerClasses = _.get(ImportedModule, 'controllers');
            }

            if (!Array.isArray(controllerClasses)) {
                return result;
            }

            return result.concat(controllerClasses);
        }, [] as ClassType[]);
    }
}
