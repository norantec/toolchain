import {
    createParamDecorator,
    ExecutionContext,
} from '@nestjs/common';
import { UserDAO } from '../daos/user.dao.class';

export const CurrentUserId = createParamDecorator((context: ExecutionContext): any => {
    const request = context.switchToHttp().getRequest();
    const userDTO = request?.user;

    if (!userDTO || !(userDTO instanceof UserDAO)) {
        return null;
    }

    return userDTO;
});
