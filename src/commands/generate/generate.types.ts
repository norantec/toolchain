import { InferType } from 'yup';
import { SCHEMA } from './generate.constants';

export type GenerateOptions = InferType<typeof SCHEMA>;
export type GenerateLoader = (options: GenerateOptions) => string;
