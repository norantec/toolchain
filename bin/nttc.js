#!/usr/bin/env node

const { Bump } = require('../dist/devtools/bump');
const { Builder } = require('../dist/devtools/builder');
const { Command } = require('commander');

const program = new Command('nttc');

program.addCommand(Bump.generateCommand());
program.addCommand(Builder.generateCommand());

program.parse(process.argv);
