import * as memfs from 'memfs';
import * as webpack from 'webpack';

export class VirtualFilePlugin {
    public constructor(private readonly volume: memfs.IFs) {}

    public apply(compiler: webpack.Compiler) {
        compiler.outputFileSystem = this.volume as webpack.OutputFileSystem;
    }
}
