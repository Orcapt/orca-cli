#!/usr/bin/env node

/**
 * Lexia CLI - Command Line Interface
 * Entry point for the Lexia CLI tool
 */

const { program } = require('commander');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const kickstartPython = require('../src/commands/kickstart-python');
const kickstartNode = require('../src/commands/kickstart-node');
const { login, isLoggedIn, getCredentials, clearCredentials } = require('../src/commands/login');
const { uiInit, uiStart, uiRemove } = require('../src/commands/ui');
const { dbCreate, dbList, dbRemove } = require('../src/commands/db');

// Read version from package.json
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
);

program
  .name('lexia')
  .description('CLI tool for managing Lexia projects')
  .version(packageJson.version);

// Middleware to check if user is logged in
function requireAuth(commandName) {
  if (!isLoggedIn()) {
    console.log(chalk.red('\n✗ You must be logged in to use this command'));
    console.log(chalk.cyan('Please run:'), chalk.yellow('lexia login'), chalk.cyan('first\n'));
    process.exit(1);
  }
}

// Login command
program
  .command('login')
  .description('Authenticate with Lexia')
  .action(login);

// Logout command
program
  .command('logout')
  .description('Clear stored credentials')
  .action(() => {
    if (clearCredentials()) {
      console.log(chalk.green('\n✓ Successfully logged out\n'));
    } else {
      console.log(chalk.yellow('\n⚠ No credentials found\n'));
    }
  });

// Status command
program
  .command('status')
  .description('Check authentication status')
  .action(() => {
    const credentials = getCredentials();
    if (credentials) {
      console.log(chalk.cyan('\n============================================================'));
      console.log(chalk.green('✓ Authenticated'));
      console.log(chalk.cyan('============================================================'));
      console.log(chalk.white('Mode:     '), chalk.yellow(credentials.mode === 'dev' ? 'Sandbox/Pro' : 'Team'));
      console.log(chalk.white('Workspace:'), chalk.yellow(credentials.workspace));
      console.log(chalk.white('Since:    '), chalk.yellow(new Date(credentials.timestamp).toLocaleString()));
      console.log(chalk.cyan('============================================================\n'));
    } else {
      console.log(chalk.red('\n✗ Not authenticated'));
      console.log(chalk.cyan('Run:'), chalk.yellow('lexia login'), chalk.cyan('to authenticate\n'));
    }
  });

// UI commands
const uiCmd = program
  .command('ui')
  .description('Manage Lexia UI installation and execution');

uiCmd
  .command('init')
  .description('Install Lexia UI globally')
  .action(() => {
    requireAuth('ui init');
    uiInit();
  });

uiCmd
  .command('start')
  .description('Start the Lexia UI')
  .option('-p, --port <number>', 'Port for the frontend UI', '3000')
  .option('-a, --agent-port <number>', 'Port for the agent backend', '5001')
  .action((options) => {
    requireAuth('ui start');
    uiStart(options);
  });

uiCmd
  .command('remove')
  .description('Uninstall Lexia UI')
  .action(() => {
    requireAuth('ui remove');
    uiRemove();
  });

// Database commands
const dbCmd = program
  .command('db')
  .description('Manage PostgreSQL databases');

dbCmd
  .command('create')
  .description('Create a new PostgreSQL database')
  .option('--postgres', 'Create PostgreSQL database (default)', true)
  .action((options) => {
    requireAuth('db create');
    dbCreate(options);
  });

dbCmd
  .command('list')
  .description('List all databases for your workspace')
  .action(() => {
    requireAuth('db list');
    dbList();
  });

dbCmd
  .command('remove <database-name>')
  .description('Delete a database')
  .action((databaseName) => {
    requireAuth('db remove');
    dbRemove(databaseName);
  });

// Kickstart command with subcommands for different languages
const kickstartCmd = program
  .command('kickstart')
  .description('Quick setup for a new Lexia project')
  .action(() => {
    requireAuth('kickstart');
    console.log(chalk.cyan('\n📚 Usage:'), chalk.white('lexia kickstart <language> [options]\n'));
    console.log(chalk.cyan('Available languages:\n'));
    console.log(chalk.green('  python'), '  - Python-based agent (FastAPI + OpenAI)', chalk.green('✓ Available'));
    console.log(chalk.green('  node'), '    - Node.js-based agent (Express + OpenAI)', chalk.green('✓ Available'));
    console.log(chalk.yellow('  go'), '      - Go-based agent', chalk.yellow('🚧 Coming soon'));
    console.log();
    console.log(chalk.cyan('Examples:'));
    console.log(chalk.white('  lexia kickstart python'));
    console.log(chalk.white('  lexia kickstart node'));
    console.log();
    console.log(chalk.cyan('Help:'), chalk.white('lexia kickstart <language> --help\n'));
  });

// Python starter kit
kickstartCmd
  .command('python')
  .description('Set up a Python-based Lexia agent (FastAPI + OpenAI)')
  .option('-d, --directory <name>', 'Directory name for the project', 'lexia-kickstart')
  .option('-p, --port <number>', 'Port for the frontend UI', '3000')
  .option('-a, --agent-port <number>', 'Port for the agent backend', '5001')
  .option('--no-start', 'Skip starting the servers after setup')
  .action((options) => {
    requireAuth('kickstart python');
    kickstartPython(options);
  });

// Node.js starter kit
kickstartCmd
  .command('node')
  .description('Set up a Node.js-based Lexia agent (Express + OpenAI)')
  .option('-d, --directory <name>', 'Directory name for the project', 'lexia-kickstart')
  .option('-p, --port <number>', 'Port for the frontend UI', '3000')
  .option('-a, --agent-port <number>', 'Port for the agent backend', '5001')
  .option('--no-start', 'Skip starting the servers after setup')
  .action((options) => {
    requireAuth('kickstart node');
    kickstartNode(options);
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

