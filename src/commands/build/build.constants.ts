import * as yup from 'yup';

export const SCHEMA = yup.object().shape({
    binary: yup.boolean().optional().default(false),
    clean: yup.boolean().optional().default(true),
    compiler: yup.string().optional().default('typescript'),
    entry: yup.string().required().default('src/main.ts'),
    loader: yup.string().optional(),
    name: yup.string().required().default('index'),
    outputFilename: yup.string().optional().default('[name].js'),
    outputPath: yup.string().optional().default('dist'),
    tsProject: yup.string().optional().default('tsconfig.json'),
    watch: yup.boolean().optional().default(false),
    workDir: yup.string().optional().default(process.cwd()),
});
