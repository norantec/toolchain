import { InferType } from 'yup';
import { SCHEMA } from './sdk.constants';

export type SDKOptions = InferType<typeof SCHEMA>;
