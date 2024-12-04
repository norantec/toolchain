import { ApiExtraModels } from '@nestjs/swagger';
import { ClassType } from '../types/class-type.type';

const container = new Map<string, ClassType>();

export const Models = (models: ClassType[]): ClassDecorator => {
    return (target) => {
        models.forEach((model) => {
            container.set(model?.name, model);
        });
        ApiExtraModels(...models)(target);
    };
};

Models.get = (name: string) => container.get(name);
