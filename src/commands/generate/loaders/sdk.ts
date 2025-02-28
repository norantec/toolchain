import { GenerateLoader } from '../generate.types';
import * as path from 'path';

export default ((options) => {
    return `
        import 'reflect-metadata';
        import { OpenApiUtil } from '@norantec/devkit/dist/utilities/open-api-util.class';
        import { SDKUtil } from '@norantec/devkit/dist/utilities/sdk-util.class';
        import { ApiController } from '@norantec/devkit/dist/decorators/api-controller.decorator';
        import ENTRY from '${path.resolve(options.entry)}';
        import * as fs from 'fs';

        async function bootstrap() {
            if (Array.isArray(ENTRY?.models)) {
                ENTRY?.models?.forEach?.((model) => {
                    ApiController.registerModel(model);
                });
            }

            await ENTRY?.onBeforeBootstrap?.();

            const openApiUtil = new OpenApiUtil({
                Class: ENTRY?.Module,
                scopeNameBlacklist: ENTRY?.scopeNameBlacklist ?? [],
            });
            const openApiDocument = openApiUtil.generateDocument();
            const sdkUtil = new SDKUtil({

            });
        }

        bootstrap();
    `;
}) as GenerateLoader;
