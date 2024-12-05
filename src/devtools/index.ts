import { Bump } from './bump';
import { Builder } from './builder';
import { Setup } from './setup';
import { Command } from 'commander';

const program = new Command('nttc');

program.addCommand(Bump.generateCommand());
program.addCommand(Builder.generateCommand());
program.addCommand(Setup.generateCommand());

program.parse(process.argv);
