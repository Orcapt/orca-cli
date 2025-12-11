/**
 * Orca UI Commands
 * Manage Orca UI installation and execution
 */

const chalk = require('chalk');
const ora = require('ora');
const spawn = require('cross-spawn');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { ensurePortAvailable } = require('../utils');

// Track UI installation status
const UI_CONFIG_FILE = path.join(os.homedir(), '.orca', 'ui-config.json');

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
    const result = spawn.sync('npm', ['list', '@orca/ui', '--depth=0'], {
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: os.homedir()
    });
    
    return result.stdout.includes('@orca/ui');
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
    const result = spawn.sync('npm', ['list', '-g', '@orca/ui', '--depth=0'], {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    return result.status === 0 && result.stdout.includes('@orca/ui');
  } catch (error) {
    return false;
  }
}

/**
 * UI Init Command - Install Orca UI globally
 */
async function uiInit() {
  console.log(chalk.cyan('\n============================================================'));
  console.log(chalk.cyan('📦 Orca UI - Global Installation'));
  console.log(chalk.cyan('============================================================\n'));

  // Check if already installed
  if (isUIInstalled()) {
    console.log(chalk.yellow('⚠ Orca UI is already installed globally'));
    console.log(chalk.cyan('\nTo reinstall, run:'), chalk.white('orca ui remove'), chalk.cyan('first\n'));
    return;
  }

  const spinner = ora('Installing @orca/ui globally...').start();

  try {
    const result = spawn.sync('npm', ['install', '-g', '@orca/ui'], {
      encoding: 'utf8',
      stdio: 'inherit'
    });

    if (result.status === 0) {
      spinner.succeed(chalk.green('Orca UI installed successfully!'));
      saveUIConfig(true);
      
      console.log(chalk.cyan('\n============================================================'));
      console.log(chalk.green('✓ Installation Complete'));
      console.log(chalk.cyan('============================================================'));
      console.log(chalk.white('\n📦 Package:'), chalk.yellow('@orca/ui'));
      console.log(chalk.white('📁 Type:'), chalk.white('React component library with built UI'));
      console.log(chalk.white('\nYou can now run:'));
      console.log(chalk.yellow('  • orca ui start --port 3000 --agent-port 5001'));
      console.log(chalk.cyan('============================================================\n'));
    } else {
      spinner.fail(chalk.red('Installation failed'));
      console.log(chalk.red('\n✗ Failed to install @orca/ui'));
      console.log(chalk.yellow('\nTry running manually:'), chalk.white('npm install -g @orca/ui\n'));
      process.exit(1);
    }
  } catch (error) {
    spinner.fail(chalk.red('Installation error'));
    console.log(chalk.red(`Error: ${error.message}\n`));
    process.exit(1);
  }
}

/**
 * UI Start Command - Run the Orca UI
 */
async function uiStart(options) {
  const port = options.port || '3000';
  const agentPort = options.agentPort || '5001';

  console.log(chalk.cyan('\n============================================================'));
  console.log(chalk.cyan('🚀 Starting Orca UI'));
  console.log(chalk.cyan('============================================================\n'));

  const isInstalled = isUIInstalled();
  
  if (!isInstalled && !isNpxAvailable()) {
    console.log(chalk.red('✗ Orca UI is not installed and npx is not available'));
    console.log(chalk.yellow('\nPlease run:'), chalk.white('orca ui init'), chalk.yellow('to install\n'));
    process.exit(1);
  }

  console.log(chalk.white('Frontend:'), chalk.yellow(`http://localhost:${port}`));
  console.log(chalk.white('Backend: '), chalk.yellow(`http://localhost:${agentPort}`));
  console.log(chalk.green('\n✓ Serving @orca/ui from global installation'));
  console.log(chalk.gray(`   Configure your agent endpoint in the UI settings`));
  
  console.log(chalk.cyan('\n⚠ Press Ctrl+C to stop the UI\n'));
  console.log(chalk.cyan('============================================================\n'));

  try {
    // Ensure port is available before starting
    await ensurePortAvailable(parseInt(port), 'UI');
    
    let uiProcess;
    
    // Find the path to the installed @orca/ui package
    let uiDistPath;
    
    if (isInstalled) {
      // Get the global node_modules path
      const result = spawn.sync('npm', ['root', '-g'], {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      if (result.status === 0) {
        const globalModulesPath = result.stdout.trim();
        uiDistPath = path.join(globalModulesPath, '@orca', 'ui', 'dist');
        
        if (!fs.existsSync(uiDistPath)) {
          console.log(chalk.red(`\n✗ @orca/ui is installed but dist folder not found at: ${uiDistPath}`));
          console.log(chalk.yellow('\nTry reinstalling:'), chalk.white('orca ui remove && orca ui init\n'));
          process.exit(1);
        }
      }
    }
    
    if (!uiDistPath) {
      console.log(chalk.red('\n✗ Could not find @orca/ui installation'));
      console.log(chalk.yellow('\nPlease run:'), chalk.white('orca ui init\n'));
      process.exit(1);
    }
    
    console.log(chalk.gray(`Serving UI from: ${uiDistPath}\n`));
    
    // Serve the dist folder using http-server
    uiProcess = spawn(
      'npx',
      ['-y', 'http-server', uiDistPath, '-p', port, '--cors', '-o'],
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
      console.log(chalk.yellow('⚠ Stopping Orca UI...'));
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
 * UI Remove Command - Uninstall Orca UI
 */
async function uiRemove() {
  console.log(chalk.cyan('\n============================================================'));
  console.log(chalk.cyan('🗑️  Removing Orca UI'));
  console.log(chalk.cyan('============================================================\n'));

  // Check if installed
  if (!isUIInstalled()) {
    console.log(chalk.yellow('⚠ Orca UI is not installed globally\n'));
    return;
  }

  const spinner = ora('Uninstalling @orca/ui...').start();

  try {
    const result = spawn.sync('npm', ['uninstall', '-g', '@orca/ui'], {
      encoding: 'utf8',
      stdio: 'inherit'
    });

    if (result.status === 0) {
      spinner.succeed(chalk.green('Orca UI removed successfully!'));
      saveUIConfig(false);
      
      console.log(chalk.cyan('\n============================================================'));
      console.log(chalk.green('✓ Uninstallation Complete'));
      console.log(chalk.cyan('============================================================'));
      console.log(chalk.white('\n@orca/ui package has been removed.'));
      console.log(chalk.white('\nTo reinstall, run:'), chalk.yellow('orca ui init'));
      console.log(chalk.cyan('============================================================\n'));
    } else {
      spinner.fail(chalk.red('Uninstallation failed'));
      console.log(chalk.red('\n✗ Failed to remove @orca/ui'));
      console.log(chalk.yellow('\nTry running manually:'), chalk.white('npm uninstall -g @orca/ui\n'));
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

