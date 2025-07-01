import { StringUtil } from '@open-norantec/utilities/dist/string-util.class';
import { CommandFactory } from '../../factories/command.factory';
import * as commander from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import { z } from 'zod';

export const LinkCommand = CommandFactory.create({
    schema: z.object({
        dest: z.array(z.string()),
    }),
    register: ({ callback }) => {
        return new commander.Command('link')
            .option('-d, --dest <string...>', 'destination that the package will be linked to')
            .action(callback);
    },
    run: ({ options }) => {
        const { dest } = options ?? {};

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

            if (!packageJson || StringUtil.isFalsyString(packageJson.name)) {
                process.exit(2);
            }

            const packageName = packageJson.name;
            const finalTargetPathname = path.resolve(destinationPathname, 'node_modules', packageName);
            fs.removeSync(finalTargetPathname);
            fs.symlinkSync(process.cwd(), finalTargetPathname, 'dir');
        }
    },
    context: {},
});
