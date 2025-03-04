import * as path from 'path';

export class ResolveUtil {
    private relativeDirname: string;

    public constructor(dirname: string) {
        this.relativeDirname = path.relative(path.resolve(__dirname, '..'), dirname);
    }

    public preserved(pathname: string) {
        return path.resolve(__dirname, '../../preserved', this.relativeDirname, pathname);
    }
}
