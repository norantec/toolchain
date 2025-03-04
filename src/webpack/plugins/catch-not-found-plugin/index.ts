/* eslint-disable @typescript-eslint/no-this-alias */
import * as winston from 'winston';
import * as webpack from 'webpack';
import { ResolveUtil } from '../../../utilities/resolve-util.class';

export class CatchNotFoundPlugin {
    public constructor(private logger?: winston.Logger) {}
    public apply(resolver: webpack.Resolver) {
        const resolve = resolver.resolve;
        const logger = this.logger;
        resolver.resolve = function (context: Record<string, any>, path, request, resolveContext, callback) {
            const self = this;
            resolve.call(self, context, path, request, resolveContext, (error, innerPath, result) => {
                const notfoundPathname = new ResolveUtil(__dirname).preserved('@@notfound.js') + `?${request}`;
                if (result) {
                    return callback(null, innerPath, result);
                }
                if (error && !error.message.startsWith("Can't resolve")) {
                    return callback(error);
                }
                // Allow .js resolutions to .tsx? from .tsx?
                if (
                    request.endsWith('.js') &&
                    context.issuer &&
                    (context.issuer.endsWith('.ts') || context.issuer.endsWith('.tsx'))
                ) {
                    return resolve.call(
                        self,
                        context,
                        path,
                        request.slice(0, -3),
                        resolveContext,
                        (error1, innerPath, result) => {
                            if (result) return callback(null, innerPath, result);
                            if (error1 && !error1.message.startsWith("Can't resolve")) return callback(error1);
                            // make not found errors runtime errors
                            callback(null, notfoundPathname, {
                                path: result,
                                context,
                            });
                        },
                    );
                }
                logger?.warn?.(`Notfound '${context.issuer}' from '${request}', skipping...`);
                // make not found errors runtime errors
                callback(null, notfoundPathname, {
                    path: result,
                    context,
                });
            });
        };
    }
}
