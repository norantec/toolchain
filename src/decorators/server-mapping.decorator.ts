import {
    BelongsToOptions,
    UUID,
    UUIDV1,
    UUIDV4,
} from 'sequelize';
import {
    BelongsTo as SequelizeBelongsTo,
    Column,
    CreatedAt,
    Model,
    Table as SequelizeTable,
    TableOptions,
    UpdatedAt,
    ForeignKey,
    HasMany,
    ModelClassGetter,
    DataType,
    Index,
} from 'sequelize-typescript';
import { ClassType } from '../types/class-type.type';

function Table<M extends Model = Model>(options: TableOptions<M>) {
    return (target: ClassType<M>) => {
        const newOptions = !options ? {} : options;

        if (!Array.isArray(newOptions?.indexes)) {
            newOptions.indexes = [];
        }

        newOptions.indexes = Array.from(newOptions.indexes).concat({
            name: 'pagination',
            fields: [
                'id',
                'created_at',
            ],
        });

        Reflect.defineMetadata(ServerMapping.modelOriginalNameMetadataKey, target.name, target);
        SequelizeTable({
            ...newOptions,
            tableName: newOptions?.modelName,
            modelName: target.name,
        })(target);
    };
}

function BelongsTo(associatedClassGetter: ModelClassGetter<{}, {}>, options?: BelongsToOptions): Function {
    return SequelizeBelongsTo(associatedClassGetter, {
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        ...options,
    });
}

export type ServerMappingCallback = (context: {
    BelongsTo: typeof BelongsTo;
    CreatedAt: typeof CreatedAt;
    Column: typeof Column;
    DataType: typeof DataType;
    ForeignKey: typeof ForeignKey;
    HasMany: typeof HasMany;
    Index: typeof Index;
    Table: typeof Table;
    UpdatedAt: typeof UpdatedAt;
    UUID: typeof UUID;
    UUIDV1: typeof UUIDV1;
    UUIDV4: typeof UUIDV4;
}) => any;

export function ServerMapping(callback: ServerMappingCallback) {
    return callback({
        BelongsTo,
        CreatedAt,
        Column,
        DataType,
        ForeignKey,
        HasMany,
        Index,
        Table,
        UpdatedAt,
        UUID,
        UUIDV1,
        UUIDV4,
    });
};

ServerMapping.modelOriginalNameMetadataKey = Symbol('');
