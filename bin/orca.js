#!/usr/bin/env node

/**
 * orcapt CLI - Command Line Interface
 * Entry point for the orcapt CLI tool
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
const fetchDoc = require('../src/commands/fetch-doc');
const {
  bucketCreate,
  bucketList,
  bucketInfo,
  bucketDelete,
  fileUpload,
  fileDownload,
  fileList,
  fileDelete
} = require('../src/commands/storage');
const { lambdaDeploy, lambdaList, lambdaInvoke, lambdaLogs, lambdaRemove, lambdaInfo } = require('../src/commands/lambda');

// Read version from package.json
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
);

program
  .name('orcapt')
  .description('CLI tool for managing orcapt projects')
  .version(packageJson.version);

// Middleware to check if user is logged in
function requireAuth(commandName) {
  if (!isLoggedIn()) {
    console.log(chalk.red('\n✗ You must be logged in to use this command'));
    console.log(chalk.cyan('Please run:'), chalk.yellow('orcapt login'), chalk.cyan('first\n'));
    process.exit(1);
  }
}

// Login command
program
  .command('login')
  .description('Authenticate with orcapt')
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
      console.log(chalk.cyan('Run:'), chalk.yellow('orcapt login'), chalk.cyan('to authenticate\n'));
    }
  });

// UI commands
const uiCmd = program
  .command('ui')
  .description('Manage orcapt UI installation and execution');

uiCmd
  .command('init')
  .description('Install orcapt UI globally')
  .action(() => {
    requireAuth('ui init');
    uiInit();
  });

uiCmd
  .command('start')
  .description('Start the orcapt UI')
  .option('-p, --port <number>', 'Port for the frontend UI', '3000')
  .option('-a, --agent-port <number>', 'Port for the agent backend', '5001')
  .action((options) => {
    requireAuth('ui start');
    uiStart(options);
  });

uiCmd
  .command('remove')
  .description('Uninstall orcapt UI')
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
  .description('Quick setup for a new orcapt project')
  .action(() => {
    requireAuth('kickstart');
    console.log(chalk.cyan('\n📚 Usage:'), chalk.white('orcapt kickstart <language> [options]\n'));
    console.log(chalk.cyan('Available languages:\n'));
    console.log(chalk.green('  python'), '  - Python-based agent (FastAPI + OpenAI)', chalk.green('✓ Available'));
    console.log(chalk.green('  node'), '    - Node.js-based agent (Express + OpenAI)', chalk.green('✓ Available'));
    console.log(chalk.yellow('  go'), '      - Go-based agent', chalk.yellow('🚧 Coming soon'));
    console.log();
    console.log(chalk.cyan('Examples:'));
    console.log(chalk.white('  orcapt kickstart python'));
    console.log(chalk.white('  orcapt kickstart node'));
    console.log();
    console.log(chalk.cyan('Help:'), chalk.white('orcapt kickstart <language> --help\n'));
  });

// Python starter kit
kickstartCmd
  .command('python')
  .description('Set up a Python-based orcapt agent (FastAPI + OpenAI)')
  .option('-d, --directory <name>', 'Directory name for the project', 'orcapt-kickstart')
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
  .description('Set up a Node.js-based orcapt agent (Express + OpenAI)')
  .option('-d, --directory <name>', 'Directory name for the project', 'orcapt-kickstart')
  .option('-p, --port <number>', 'Port for the frontend UI', '3000')
  .option('-a, --agent-port <number>', 'Port for the agent backend', '5001')
  .option('--no-start', 'Skip starting the servers after setup')
  .action((options) => {
    requireAuth('kickstart node');
    kickstartNode(options);
  });

kickstartCmd
  .command('go')
  .description('Set up a Go-based orcapt agent (Coming soon)')
  .action(() => {
    console.log(chalk.yellow('\n⚠ Go starter kit is coming soon!'));
    console.log(chalk.cyan('For now, use:'), chalk.white('orcapt kickstart python\n'));
  });

// Fetch commands
const fetchCmd = program
  .command('fetch')
  .description('Fetch resources and documentation');

fetchCmd
  .command('doc')
  .description('Download orcapt SDK documentation')
  .action(fetchDoc);

// Storage commands
const storageCmd = program
  .command('storage')
  .description('Manage S3-like storage buckets and files');

// Bucket subcommands
const bucketCmd = storageCmd
  .command('bucket')
  .description('Manage storage buckets');

bucketCmd
  .command('create <name>')
  .description('Create a new storage bucket')
  .option('--public', 'Make bucket public', false)
  .option('--versioning', 'Enable versioning', false)
  .option('--no-encryption', 'Disable encryption')
  .option('--encryption-type <type>', 'Encryption type (AES256 or aws:kms)', 'AES256')
  .option('--description <text>', 'Bucket description')
  .action((name, options) => {
    requireAuth('storage bucket create');
    bucketCreate(name, options);
  });

bucketCmd
  .command('list')
  .description('List all storage buckets')
  .action(() => {
    requireAuth('storage bucket list');
    bucketList();
  });

bucketCmd
  .command('info <name>')
  .description('Get bucket information')
  .action((name) => {
    requireAuth('storage bucket info');
    bucketInfo(name);
  });

bucketCmd
  .command('delete <name>')
  .description('Delete a storage bucket')
  .option('--force', 'Force delete (remove all files)', false)
  .action((name, options) => {
    requireAuth('storage bucket delete');
    bucketDelete(name, options);
  });

// File commands
storageCmd
  .command('upload <bucket> <file-path>')
  .description('Upload file to bucket')
  .option('--folder <path>', 'Remote folder path')
  .option('--public', 'Make file public', false)
  .action((bucket, filePath, options) => {
    requireAuth('storage upload');
    fileUpload(bucket, filePath, options);
  });

storageCmd
  .command('download <bucket> <file-key> [local-path]')
  .description('Download file from bucket')
  .action((bucket, fileKey, localPath) => {
    requireAuth('storage download');
    fileDownload(bucket, fileKey, localPath);
  });

storageCmd
  .command('files <bucket>')
  .description('List files in bucket')
  .option('--folder <path>', 'Filter by folder path')
  .option('--page <number>', 'Page number', '1')
  .option('--per-page <number>', 'Items per page', '50')
  .action((bucket, options) => {
    requireAuth('storage files');
    fileList(bucket, options);
  });

storageCmd
  .command('delete <bucket> <file-key>')
  .description('Delete file from bucket')
  .action((bucket, fileKey) => {
    requireAuth('storage delete');
    fileDelete(bucket, fileKey);
  });

// Permission commands removed as per user request

// Ship command - Deploy Docker images to Lambda
program
  .command('ship <function-name>')
  .description('🚀 Deploy Docker image to AWS Lambda')
  .option('--image <image>', 'Docker image (registry/image:tag)')
  .option('--memory <mb>', 'Memory in MB', '512')
  .option('--timeout <seconds>', 'Timeout in seconds', '30')
  .option('--env <key=value>', 'Environment variable (can be repeated)', (val, memo) => { memo.push(val); return memo; }, [])
  .option('--env-file <path>', 'Path to .env file')
  .action((functionName, options) => {
    requireAuth('ship');
    lambdaDeploy(functionName, options);
  });

// Lambda commands (alias for backward compatibility)
const lambdaCmd = program
  .command('lambda')
  .description('Manage AWS Lambda functions');

lambdaCmd
  .command('list')
  .description('List Lambda functions')
  .action(() => {
    requireAuth('lambda list');
    lambdaList();
  });

lambdaCmd
  .command('info <function-name>')
  .description('Get Lambda function details')
  .action((functionName) => {
    requireAuth('lambda info');
    lambdaInfo(functionName);
  });

lambdaCmd
  .command('invoke <function-name>')
  .description('Invoke Lambda function')
  .option('--payload <json>', 'JSON payload')
  .action((functionName, options) => {
    requireAuth('lambda invoke');
    lambdaInvoke(functionName, options);
  });

lambdaCmd
  .command('logs <function-name>')
  .description('Get Lambda function logs')
  .option('--tail', 'Stream logs in real-time')
  .option('--since <time>', 'Show logs since (e.g., 1h, 30m)', '10m')
  .action((functionName, options) => {
    requireAuth('lambda logs');
    lambdaLogs(functionName, options);
  });

lambdaCmd
  .command('remove <function-name>')
  .description('Remove Lambda function')
  .action((functionName) => {
    requireAuth('lambda remove');
    lambdaRemove(functionName);
  });

// Handle unknown commands
program.on('command:*', () => {
  console.error(chalk.red(`\n✗ Invalid command: ${program.args.join(' ')}\n`));
  console.log(chalk.cyan('Run'), chalk.yellow('orcapt --help'), chalk.cyan('to see available commands\n'));
  process.exit(1);
});

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

