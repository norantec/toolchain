import { BuildLoader } from '../build.types';
import * as path from 'path';
import { Constructor } from 'type-fest';

type Resolver = <T>(clazz: Constructor<T>) => Promise<T>;

export interface Entry {
    Module: any;
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
        import ENTRY from '${path.resolve(options.entry)}';

        async function bootstrap() {
            if (Array.isArray(ENTRY?.models)) {
                ENTRY?.models?.forEach?.((model) => {
                    ApiController.registerModel(model);
                });
            }

            await ENTRY?.onBeforeBootstrap?.();

            const openApiUtil = new OpenApiUtil({
                Clazz: ENTRY?.Module,
            });
            const openApiDocument = openApiUtil.generateDocument();
            const app = await NestFactory.create(ENTRY?.Module);
            const resolver = (clazz) => app.resolve(clazz);
            const listenPort = await ENTRY?.getListenPort?.(resolver);

            SwaggerModule.setup('/docs/apis', app, openApiDocument, {
                customCssUrl: ['https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.7.2}/swagger-ui.css'],
                customJs: ['https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.7.2}/swagger-ui-bundle.js', 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.7.2}/swagger-ui-standalone-preset.js'],
            });

            await app.listen(listenPort ?? 8080, () => {
                console.log('Listening on port:', listenPort);
                ENTRY?.callback?.(resolver);
            });
        }

        bootstrap();
    `;
}) as BuildLoader;
