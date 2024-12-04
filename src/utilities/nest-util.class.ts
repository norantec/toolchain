import { ClassType } from '../types/class-type.type';

export class NestUtil {
    public static getControllerClasses(Clazz: ClassType) {
        let importedModules: ClassType[] = Reflect.getMetadata('imports', Clazz);

        if (!Array.isArray(importedModules)) {
            importedModules = [];
        }

        return importedModules.reduce((result: ClassType[], ImportedModule) => {
            const controllerClasses = Reflect.getMetadata('controllers', ImportedModule);
            if (!Array.isArray(controllerClasses)) {
                return result;
            }
            return result.concat(controllerClasses);
        }, [] as ClassType[]);
    }
}
