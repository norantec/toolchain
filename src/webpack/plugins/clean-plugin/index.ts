import * as webpack from 'webpack';
import * as _ from 'lodash';

export class CleanPlugin {
    public apply(compiler: webpack.Compiler) {
        compiler.hooks.compilation.tap(CleanPlugin.name, (compilation) => {
            compilation.hooks.processAssets.tap(
                {
                    name: CleanPlugin.name,
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
