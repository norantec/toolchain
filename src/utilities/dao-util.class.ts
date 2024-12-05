import { ServerMapping } from '../decorators/server-mapping.decorator';
import { ClassType } from '../types/class-type.type';

export class DAOUtil {
    public static getOriginalName(Clazz: ClassType) {
        return Reflect.getMetadata(ServerMapping.modelOriginalNameMetadataKey, Clazz);
    }
}
