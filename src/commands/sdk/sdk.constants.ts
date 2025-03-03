import * as yup from 'yup';

export const SCHEMA = yup.object().shape({
    authorEmail: yup.string().optional(),
    authorName: yup.string().optional(),
    compiler: yup.string().optional().default('typescript'),
    entry: yup.string().required().default('src/main.ts'),
    outputPath: yup.string().optional().default('dist'),
    packageName: yup.string().required(),
    registry: yup.string().optional().default('https://registry.npmjs.org'),
    tsProject: yup.string().optional().default('tsconfig.json'),
    workDir: yup.string().optional().default(process.cwd()),
});
