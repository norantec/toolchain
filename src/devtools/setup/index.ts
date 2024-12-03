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
                    const packageJson = fs.readJsonSync(path.resolve(__dirname, '../package.json'));
                    const destinationPackagePathname = path.resolve(destinationPathname, 'node_modules/' + packageJson.name);

                    if (!packageJson) {
                        process.exit(2);
                    }

                    const files = _.uniq([
                        'package.json',
                        'README.md',
                        ...(packageJson?.files || []),
                    ]);

                    fs.removeSync(destinationPackagePathname);
                    fs.mkdirpSync(destinationPackagePathname);

                    for (const file of files) {
                        const sourcePathname = path.resolve(__dirname, '..', file);

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
