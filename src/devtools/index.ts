import { Bump } from './bump';
import { Build } from './build';
import { Setup } from './setup';
import { Command } from 'commander';

const program = new Command('nttc');

program.addCommand(Bump.generateCommand());
program.addCommand(Build.generateCommand());
program.addCommand(Setup.generateCommand());

program.parse(process.argv);
