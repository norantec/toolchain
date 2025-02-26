import * as yup from 'yup';
import { BumpType } from '../bump/bump.command.class';

export const SCHEMA = yup.object({
    packageName: yup.string().required(),
    packageVersion: yup.string().required(),
    bumpType: yup.string().required().oneOf(Object.values(BumpType)),
    readme: yup.string().optional(),
    authorName: yup.string().optional(),
    authorEmail: yup.string().optional(),
    registry: yup.string().optional().default('https://registry.npmjs.org'),
});
