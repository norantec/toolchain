import * as yup from 'yup';
import { BumpType } from '../../enums/bump-type.enum';

export const SCHEMA = yup.object().shape({
    authorEmail: yup.string().optional(),
    authorName: yup.string().optional(),
    bumpType: yup.string().required().oneOf(Object.values(BumpType)),
    compiler: yup.string().optional().default('typescript'),
    entry: yup.string().required().default('src/main.ts'),
    outputPath: yup.string().optional().default('dist'),
    packageName: yup.string().required(),
    packageVersion: yup.string().required(),
    registry: yup.string().optional().default('https://registry.npmjs.org'),
    tsProject: yup.string().optional().default('tsconfig.json'),
    workDir: yup.string().optional().default(process.cwd()),
});
