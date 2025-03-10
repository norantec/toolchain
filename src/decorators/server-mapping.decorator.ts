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

function Table<M extends Model = Model>(options: TableOptions<M>) {
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
    newOptions.timestamps = true;
    newOptions.updatedAt = false;

    return SequelizeTable({
        ...newOptions,
        hooks: {
            beforeSave(instance) {
                instance?.set?.('createdAt', new Date(instance?.get?.('createdAt')).getTime());
                instance?.set?.('updatedAt', new Date(instance?.get?.('updatedAt')).getTime());
            },
        },
    });
}

function BelongsTo(associatedClassGetter: ModelClassGetter<{}, {}>, options?: BelongsToOptions): Function {
    return SequelizeBelongsTo(associatedClassGetter, {
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        ...options,
    });
}

export type ServerMappingCallback = (context: {
    BelongsTo: typeof BelongsTo,
    CreatedAt: typeof CreatedAt,
    Column: typeof Column,
    DataType: typeof DataType,
    ForeignKey: typeof ForeignKey,
    HasMany: typeof HasMany,
    Index: typeof Index,
    Table: typeof Table,
    UpdatedAt: typeof UpdatedAt,
    UUID: typeof UUID,
    UUIDV1: typeof UUIDV1,
    UUIDV4: typeof UUIDV4,
}) => any;

export const ServerMapping = (callback: ServerMappingCallback) => {
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
