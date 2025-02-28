import * as webpack from 'webpack';
import * as _ from 'lodash';
import * as path from 'path';
import * as fs from 'fs-extra';

export class ForceWriteBundlePlugin {
    public constructor(private readonly outputPath: string) {}

    public apply(compiler: webpack.Compiler) {
        compiler.hooks.compilation.tap(ForceWriteBundlePlugin.name, (compilation) => {
            compilation.hooks.processAssets.tap(
                {
                    name: ForceWriteBundlePlugin.name,
                    stage: webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
                },
                (assets) => {
                    Object.entries(assets).forEach(([pathname, asset]) => {
                        const absolutePath = path.resolve(this.outputPath, pathname);
                        _.attempt(() => {
                            fs.mkdirpSync(path.dirname(absolutePath));
                        });
                        fs.writeFileSync(absolutePath, asset?.buffer?.());
                    });
                },
            );
        });
    }
}
