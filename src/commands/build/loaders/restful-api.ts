import { BuildLoader } from '../build.types';
import * as path from 'path';
import { Constructor } from 'type-fest';

type Resolver = <T>(Class: Constructor<T>) => Promise<T>;

export interface Entry {
    Module: Constructor<any>;
    scopeNameBlacklist?: string[];
    getListenPort: (resolver: Resolver) => number | Promise<number>;
    callback?: (resolver: Resolver) => void | Promise<void>;
    onBeforeBootstrap?: () => void | Promise<void>;
}

export default ((options) => {
    return `
        import 'reflect-metadata';
        import { NestFactory } from '@norantec/devkit/dist/lib/@nestjs/core';
        import { StringUtil } from '@norantec/nttc/dist/utilities/string-util.class';
        import { OpenApiUtil } from '@norantec/devkit/dist/utilities/openapi-util.class';
        import { SwaggerModule } from '@nestjs/swagger';
        import { ApiController } from '@norantec/devkit/dist/decorators/api-controller.decorator';
        import { LoggerService } from '@norantec/devkit/dist/modules/logger/logger.service';
        import ENTRY from '${path.resolve(options.entry)}';

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
            const app = await NestFactory.create(ENTRY?.Module);
            const resolver = (Class) => app.resolve(Class);
            const listenPort = await ENTRY?.getListenPort?.(resolver);
            const loggerService = await app.resolve(LoggerService);

            SwaggerModule.setup('/docs/apis', app, openApiDocument, {
                customCssUrl: ['https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.7.2}/swagger-ui.css'],
                customJs: ['https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.7.2}/swagger-ui-bundle.js', 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.7.2}/swagger-ui-standalone-preset.js'],
            });

            await app.listen(listenPort ?? 8080, () => {
                loggerService.log(\`Listening on port: \$\{listenPort\}\`);
                ENTRY?.callback?.(resolver);
            });
        }

        bootstrap();
    `;
}) as BuildLoader;
