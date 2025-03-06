import * as webpack from 'webpack';
import * as _ from 'lodash';

export class CleanNonJSFilePlugin {
    public apply(compiler: webpack.Compiler) {
        compiler.hooks.compilation.tap(CleanNonJSFilePlugin.name, (compilation) => {
            compilation.hooks.processAssets.tap(
                {
                    name: CleanNonJSFilePlugin.name,
                    stage: webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
                },
                (assets) => {
                    Object.keys(assets).forEach((key) => {
                        if (!key?.endsWith?.('.js')) {
                            _.unset(assets, key);
                        }
                    });
                },
            );
        });
    }
}
