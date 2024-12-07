import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as _ from 'lodash';

export class Setup {
    public static generateCommand() {
        const command = new Command('setup');

        command
            .option(
                '-d, --dest <pathnames>',
                'destination that the package will be linked to',
                (value) => {
                    if (typeof value === 'string') {
                        return value.split(/,\s*/g);
                    }
                    return [];
                },
            )
            .action((options = {}) => {
                const {
                    dest: destinationRelativePathnames,
                } = options;

                if (!Array.isArray(destinationRelativePathnames) || destinationRelativePathnames.length === 0) {
                    process.exit(1);
                }

                for (const destinationRelativePathname of destinationRelativePathnames) {
                    if (!destinationRelativePathname || typeof destinationRelativePathname !== 'string') {
                        break;
                    }

                    const destinationPathname = path.resolve(process.cwd(), destinationRelativePathname);
                    const packageJson = fs.readJsonSync(path.resolve('package.json'));
                    const destinationPackagePathname = path.resolve(destinationPathname, 'node_modules/' + packageJson.name);

                    if (!packageJson) {
                        process.exit(2);
                    }

                    const files = _.uniq([
                        'package.json',
                        'README.md',
                        ...(packageJson?.files || []),
                    ]);

                    if (!fs.existsSync(destinationPackagePathname)) {
                        fs.mkdirpSync(destinationPackagePathname);
                    }

                    for (const file of files) {
                        const sourcePathname = path.resolve(file);
                        const destinationPathname = path.resolve(destinationPackagePathname, file);

                        fs.removeSync(destinationPathname);

                        console.log(sourcePathname, '->', destinationPathname);

                        if (!fs.existsSync(sourcePathname)) {
                            continue;
                        }

                        fs.copySync(sourcePathname, path.resolve(destinationPackagePathname, file));
                    }
                }
            });

        return command;
    }
}
