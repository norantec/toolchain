import { InferType } from 'yup';
import { SCHEMA } from './build.constants';

export type BuildOptions = InferType<typeof SCHEMA>;
