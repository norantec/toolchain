#!/usr/bin/env node

const { Bump } = require('../dist/devtools/bump');
const { Builder } = require('../dist/devtools/builder');
const { Setup } = require('../dist/devtools/setup');
const { Command } = require('commander');

const program = new Command('nttc');

program.addCommand(Bump.generateCommand());
program.addCommand(Builder.generateCommand());
program.addCommand(Setup.generateCommand());

program.parse(process.argv);
