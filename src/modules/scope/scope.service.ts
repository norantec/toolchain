import {
    Inject,
    Injectable,
} from '@nestjs/common';
import { METADATA_NAMES } from '../../constants/metadata-names.constant';
import { StringUtil } from '../../utilities/string-util.class';
import { NestUtil } from '../../utilities/nest-util.class';
import { ClassType } from '../../types/class-type.type';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class ScopeService {
    @Inject(LoggerService)
    private readonly loggerService: LoggerService;

    public getAll(Clazz: ClassType) {
        let importedModules: ClassType[] = Reflect.getMetadata('imports', Clazz);

        if (!Array.isArray(importedModules)) {
            importedModules = [];
        }

        const scopes = NestUtil.getControllerClasses(Clazz).reduce((result: string[], controllerClass) => {
            const currentControllerScopeNames = Reflect.getMetadata(METADATA_NAMES.SCOPE_NAMES, controllerClass);
            if (!Array.isArray(currentControllerScopeNames)) {
                return result;
            }
            return result.concat(currentControllerScopeNames.filter((item) => !StringUtil.isFalsyString(item)));
        }, []);

        this.loggerService.log(`Got scopes: ${scopes.join(', ')}`);

        if (!Array.isArray(scopes)) {
            return [];
        }

        const filteredScopeNames = scopes.filter((item) => !StringUtil.isFalsyString(item));

        if (filteredScopeNames.length === 0) {
            return [];
        }

        return filteredScopeNames;
    }
}
