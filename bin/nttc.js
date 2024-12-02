#!/usr/bin/env node

const { Bump } = require('../dist/devtools/bump');
const { Command } = require('commander');

const program = new Command('nttc');

program.addCommand(Bump.generateCommand());

program.parse(process.argv);
