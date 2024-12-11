import { CommandFactory } from '../command-factory.class';
import * as yup from 'yup';
import * as commander from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as _ from 'lodash';

export const SetupCommand = CommandFactory.create({
    schema: yup.object().shape({
        dest: yup.string().required(),
    }),
    register: ({
        command,
        callback,
    }) => {
        // const command = new commander.Command('setup');
        command
            .addCommand(
                new commander.Command('setup')
                    .option('-d, --dest <pathnames>', 'destination that the package will be linked to', (value) => {
                        if (typeof value === 'string') {
                            return value.split(/,\s*/g);
                        }
                        return [];
                    })
                    .action(callback),
            );
    },
    run: ({ options }) => {
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
    },
    context: {},
});

