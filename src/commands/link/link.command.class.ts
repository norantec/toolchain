import { CommandFactory } from '../command-factory.class';
import * as yup from 'yup';
import * as commander from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as _ from 'lodash';
import { StringUtil } from '../../utilities/string-util.class';

export const LinkCommand = CommandFactory.create({
    schema: yup.object().shape({
        dest: yup.array(yup.string()).required(),
        copy: yup.boolean().optional().default(false),
    }),
    register: ({ command, callback }) => {
        command.addCommand(
            new commander.Command('link')
                .option('-c, --copy', 'copy the package to the destination')
                .option('-d, --dest <string...>', 'destination that the package will be linked to')
                .action(callback),
        );
    },
    run: ({ options, logger }) => {
        const { dest, copy } = options;

        if (!Array.isArray(dest) || dest.length === 0) {
            process.exit(1);
        }

        const destinationPathnames = dest
            .filter((pathname) => !StringUtil.isFalsyString(pathname))
            .map((pathname) => path.resolve(process.cwd(), pathname));

        for (const destinationPathname of destinationPathnames) {
            if (StringUtil.isFalsyString(destinationPathname)) {
                break;
            }

            const packageJson = fs.readJsonSync(path.resolve('package.json'));
            const destinationPackagePathname = path.resolve(destinationPathname, 'node_modules/' + packageJson.name);

            if (!packageJson || StringUtil.isFalsyString(packageJson.name)) {
                process.exit(2);
            }

            if (copy) {
                const files = _.uniq(['package.json', 'README.md', ...(packageJson?.files || [])]);

                if (!fs.existsSync(destinationPackagePathname)) {
                    fs.mkdirpSync(destinationPackagePathname);
                }

                for (const file of files) {
                    const sourcePathname = path.resolve(file);
                    const destinationPathname = path.resolve(destinationPackagePathname, file);

                    fs.removeSync(destinationPathname);

                    logger?.info?.(`copied: ${sourcePathname} -> ${destinationPathname}`);

                    if (!fs.existsSync(sourcePathname)) {
                        continue;
                    }

                    fs.copySync(sourcePathname, path.resolve(destinationPackagePathname, file));
                }
            } else {
                const packageName = packageJson.name;
                const finalTargetPathname = path.resolve(destinationPathname, 'node_modules', packageName);
                fs.removeSync(finalTargetPathname);
                fs.symlinkSync(process.cwd(), finalTargetPathname, 'dir');
            }
        }
    },
    context: {},
});
