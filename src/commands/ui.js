/**
 * Lexia UI Commands
 * Manage Lexia UI installation and execution
 */

const chalk = require('chalk');
const ora = require('ora');
const spawn = require('cross-spawn');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Track UI installation status
const UI_CONFIG_FILE = path.join(os.homedir(), '.lexia', 'ui-config.json');

/**
 * Check if npx is available (we'll use npx instead of global install to avoid conflicts)
 */
function isNpxAvailable() {
  try {
    const result = spawn.sync('npx', ['--version'], {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    return result.status === 0;
  } catch (error) {
    return false;
  }
}

/**
 * Check if UI package is cached locally
 */
function isUICached() {
  try {
    const result = spawn.sync('npm', ['list', '@lexia/ui', '--depth=0'], {
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: os.homedir()
    });
    
    return result.stdout.includes('@lexia/ui');
  } catch (error) {
    return false;
  }
}

/**
 * Save UI installation status
 */
function saveUIConfig(installed = true) {
  try {
    const configDir = path.dirname(UI_CONFIG_FILE);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const config = {
      installed,
      timestamp: new Date().toISOString(),
      version: installed ? 'latest' : null
    };

    fs.writeFileSync(UI_CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error(chalk.red('Failed to save UI config:', error.message));
    return false;
  }
}

/**
 * Check if UI is installed globally
 */
function isUIInstalled() {
  try {
    const result = spawn.sync('npm', ['list', '-g', '@lexia/ui', '--depth=0'], {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    return result.status === 0 && result.stdout.includes('@lexia/ui');
  } catch (error) {
    return false;
  }
}

/**
 * UI Init Command - Install Lexia UI globally
 */
async function uiInit() {
  console.log(chalk.cyan('\n============================================================'));
  console.log(chalk.cyan('📦 Lexia UI - Global Installation'));
  console.log(chalk.cyan('============================================================\n'));

  // Check if already installed
  if (isUIInstalled()) {
    console.log(chalk.yellow('⚠ Lexia UI is already installed globally'));
    console.log(chalk.cyan('\nTo reinstall, run:'), chalk.white('lexia ui remove'), chalk.cyan('first\n'));
    return;
  }

  const spinner = ora('Installing @lexia/ui globally...').start();

  try {
    const result = spawn.sync('npm', ['install', '-g', '@lexia/ui'], {
      encoding: 'utf8',
      stdio: 'inherit'
    });

    if (result.status === 0) {
      spinner.succeed(chalk.green('Lexia UI installed successfully!'));
      saveUIConfig(true);
      
      console.log(chalk.cyan('\n============================================================'));
      console.log(chalk.green('✓ Installation Complete'));
      console.log(chalk.cyan('============================================================'));
      console.log(chalk.white('\n📦 Package:'), chalk.yellow('@lexia/ui'));
      console.log(chalk.white('🔧 Binary:'), chalk.yellow('lexia-ui'), chalk.white('(available globally)'));
      console.log(chalk.white('\nYou can now run:'));
      console.log(chalk.yellow('  • lexia ui start --port 3000 --agent-port 5001'));
      console.log(chalk.yellow('  • lexia-ui --port 3000 --agent-port 5001'), chalk.gray('(direct)'));
      console.log(chalk.cyan('============================================================\n'));
    } else {
      spinner.fail(chalk.red('Installation failed'));
      console.log(chalk.red('\n✗ Failed to install @lexia/ui'));
      console.log(chalk.yellow('\nTry running manually:'), chalk.white('npm install -g @lexia/ui\n'));
      process.exit(1);
    }
  } catch (error) {
    spinner.fail(chalk.red('Installation error'));
    console.log(chalk.red(`Error: ${error.message}\n`));
    process.exit(1);
  }
}

/**
 * UI Start Command - Run the Lexia UI
 */
async function uiStart(options) {
  const port = options.port || '3000';
  const agentPort = options.agentPort || '5001';

  console.log(chalk.cyan('\n============================================================'));
  console.log(chalk.cyan('🚀 Starting Lexia UI'));
  console.log(chalk.cyan('============================================================\n'));

  const isInstalled = isUIInstalled();
  
  if (!isInstalled && !isNpxAvailable()) {
    console.log(chalk.red('✗ Lexia UI is not installed and npx is not available'));
    console.log(chalk.yellow('\nPlease run:'), chalk.white('lexia ui init'), chalk.yellow('to install\n'));
    process.exit(1);
  }

  console.log(chalk.white('Frontend:'), chalk.yellow(`http://localhost:${port}`));
  console.log(chalk.white('Backend: '), chalk.yellow(`http://localhost:${agentPort}`));
  console.log(chalk.green('\n✓ Using latest @lexia/ui via npx'));
  
  console.log(chalk.cyan('\n⚠ Press Ctrl+C to stop the UI\n'));
  console.log(chalk.cyan('============================================================\n'));

  try {
    let uiProcess;
    
    // Always use npx with latest version to ensure we get the most recent version
    uiProcess = spawn(
      'npx',
      ['-y', '@lexia/ui@latest', `--port=${port}`, `--agent-port=${agentPort}`],
      {
        stdio: 'inherit'
      }
    );

    uiProcess.on('error', (error) => {
      console.log(chalk.red(`\n✗ ${error.message}\n`));
      process.exit(1);
    });

    uiProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.log(chalk.yellow(`\n⚠ UI stopped (exit code ${code})\n`));
      }
    });

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      console.log(chalk.cyan('\n\n============================================================'));
      console.log(chalk.yellow('⚠ Stopping Lexia UI...'));
      console.log(chalk.cyan('============================================================\n'));
      uiProcess.kill('SIGINT');
      process.exit(0);
    });

  } catch (error) {
    console.log(chalk.red(`\n✗ Error starting UI: ${error.message}\n`));
    process.exit(1);
  }
}

/**
 * UI Remove Command - Uninstall Lexia UI
 */
async function uiRemove() {
  console.log(chalk.cyan('\n============================================================'));
  console.log(chalk.cyan('🗑️  Removing Lexia UI'));
  console.log(chalk.cyan('============================================================\n'));

  // Check if installed
  if (!isUIInstalled()) {
    console.log(chalk.yellow('⚠ Lexia UI is not installed globally\n'));
    return;
  }

  const spinner = ora('Uninstalling @lexia/ui...').start();

  try {
    const result = spawn.sync('npm', ['uninstall', '-g', '@lexia/ui'], {
      encoding: 'utf8',
      stdio: 'inherit'
    });

    if (result.status === 0) {
      spinner.succeed(chalk.green('Lexia UI removed successfully!'));
      saveUIConfig(false);
      
      console.log(chalk.cyan('\n============================================================'));
      console.log(chalk.green('✓ Uninstallation Complete'));
      console.log(chalk.cyan('============================================================'));
      console.log(chalk.white('\nThe lexia-ui binary has been removed.'));
      console.log(chalk.white('\nTo reinstall, run:'), chalk.yellow('lexia ui init'));
      console.log(chalk.cyan('============================================================\n'));
    } else {
      spinner.fail(chalk.red('Uninstallation failed'));
      console.log(chalk.red('\n✗ Failed to remove @lexia/ui'));
      console.log(chalk.yellow('\nTry running manually:'), chalk.white('npm uninstall -g @lexia/ui\n'));
      process.exit(1);
    }
  } catch (error) {
    spinner.fail(chalk.red('Uninstallation error'));
    console.log(chalk.red(`Error: ${error.message}\n`));
    process.exit(1);
  }
}

module.exports = {
  uiInit,
  uiStart,
  uiRemove
};

