#!/usr/bin/env node

/**
 * Lexia CLI - Command Line Interface
 * Entry point for the Lexia CLI tool
 */

const { program } = require('commander');
const chalk = require('chalk');
const kickstartPython = require('../src/commands/kickstart-python');

program
  .name('lexia')
  .description('CLI tool for managing Lexia projects')
  .version('0.1.2');

// Kickstart command with subcommands for different languages
const kickstartCmd = program
  .command('kickstart')
  .description('Quick setup for a new Lexia project')
  .action(() => {
    console.log(chalk.cyan('\n📚 Usage:'), chalk.white('lexia kickstart <language> [options]\n'));
    console.log(chalk.cyan('Available languages:\n'));
    console.log(chalk.green('  python'), '  - Python-based agent (FastAPI + OpenAI)', chalk.green('✓ Available'));
    console.log(chalk.yellow('  node'), '    - Node.js-based agent', chalk.yellow('🚧 Coming soon'));
    console.log(chalk.yellow('  go'), '      - Go-based agent', chalk.yellow('🚧 Coming soon'));
    console.log();
    console.log(chalk.cyan('Example:'), chalk.white('lexia kickstart python'));
    console.log(chalk.cyan('Help:'), chalk.white('lexia kickstart python --help\n'));
  });

// Python starter kit
kickstartCmd
  .command('python')
  .description('Set up a Python-based Lexia agent (FastAPI + OpenAI)')
  .option('-d, --directory <name>', 'Directory name for the project', 'lexia-kickstart')
  .option('-p, --port <number>', 'Port for the frontend UI', '3000')
  .option('-a, --agent-port <number>', 'Port for the agent backend', '5001')
  .option('--no-start', 'Skip starting the servers after setup')
  .action(kickstartPython);

// Future language support (placeholders)
kickstartCmd
  .command('node')
  .description('Set up a Node.js-based Lexia agent (Coming soon)')
  .action(() => {
    console.log(chalk.yellow('\n⚠ Node.js starter kit is coming soon!'));
    console.log(chalk.cyan('For now, use:'), chalk.white('lexia kickstart python\n'));
  });

kickstartCmd
  .command('go')
  .description('Set up a Go-based Lexia agent (Coming soon)')
  .action(() => {
    console.log(chalk.yellow('\n⚠ Go starter kit is coming soon!'));
    console.log(chalk.cyan('For now, use:'), chalk.white('lexia kickstart python\n'));
  });

// Handle unknown commands
program.on('command:*', () => {
  console.error(chalk.red(`\n✗ Invalid command: ${program.args.join(' ')}\n`));
  console.log(chalk.cyan('Run'), chalk.yellow('lexia --help'), chalk.cyan('to see available commands\n'));
  process.exit(1);
});

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

