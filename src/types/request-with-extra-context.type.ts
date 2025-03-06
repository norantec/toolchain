import { type Request } from 'express';
import { RequestExtraContext } from '../interfaces/request-extra-context.interface';

export type RequestWithExtraContext = Request & RequestExtraContext;
