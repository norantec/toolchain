import * as yup from 'yup';

export const SCHEMA = yup.object().shape({
    compiler: yup.string().optional().default('typescript'),
    entry: yup.string().required().default('src/main.ts'),
    loader: yup.string().optional(),
    outputPath: yup.string().optional().default('dist'),
    tsProject: yup.string().optional().default('tsconfig.json'),
    workDir: yup.string().optional().default(process.cwd()),
});
