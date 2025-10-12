/**
 * Utility functions for Lexia CLI
 */

const { spawn } = require('cross-spawn');
const chalk = require('chalk');

/**
 * Check if a command exists in the system
 * @param {string} command - Command to check
 * @returns {Promise<boolean>}
 */
async function commandExists(command) {
  return new Promise((resolve) => {
    const child = spawn(command, ['--version'], {
      stdio: 'ignore',
      shell: false
    });
    
    child.on('close', (code) => {
      resolve(code === 0);
    });
    
    child.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Get Python command (python3 or python)
 * @returns {Promise<string|null>}
 */
async function getPythonCommand() {
  if (await commandExists('python3')) {
    return 'python3';
  }
  if (await commandExists('python')) {
    return 'python';
  }
  return null;
}

/**
 * Get the virtual environment paths based on OS
 * @returns {Object}
 */
function getVenvPaths() {
  const isWindows = process.platform === 'win32';
  
  return {
    python: isWindows ? 'lexia_env\\Scripts\\python.exe' : 'lexia_env/bin/python',
    pip: isWindows ? 'lexia_env\\Scripts\\pip.exe' : 'lexia_env/bin/pip',
    activate: isWindows ? 'lexia_env\\Scripts\\activate' : 'source lexia_env/bin/activate'
  };
}

/**
 * Run a command and stream output
 * @param {string} command - Command to run
 * @param {Array} args - Command arguments
 * @param {Object} options - Spawn options
 * @returns {Promise<number>} Exit code
 */
function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Run a command silently and return output
 * @param {string} command - Command to run
 * @param {Array} args - Command arguments
 * @param {Object} options - Spawn options
 * @returns {Promise<string>} Output
 */
function runCommandSilent(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'pipe',
      shell: false,
      ...options
    });

    let output = '';
    let errorOutput = '';

    if (child.stdout) {
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
    }

    child.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(errorOutput || output));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Spawn a background process
 * @param {string} command - Command to run
 * @param {Array} args - Command arguments
 * @param {Object} options - Spawn options
 * @returns {ChildProcess}
 */
function spawnBackground(command, args = [], options = {}) {
  return spawn(command, args, {
    stdio: 'pipe',
    shell: false,
    detached: false,
    ...options
  });
}

/**
 * Wait for a port to be ready
 * @param {number} port - Port to check
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<boolean>}
 */
async function waitForPort(port, timeout = 10000) {
  const net = require('net');
  const startTime = Date.now();

  return new Promise((resolve) => {
    const checkPort = () => {
      if (Date.now() - startTime > timeout) {
        resolve(false);
        return;
      }

      const socket = new net.Socket();
      
      socket.setTimeout(500);
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        setTimeout(checkPort, 500);
      });
      
      socket.on('error', () => {
        socket.destroy();
        setTimeout(checkPort, 500);
      });

      socket.connect(port, '127.0.0.1');
    };

    checkPort();
  });
}

/**
 * Print formatted messages
 */
const print = {
  title: (text) => console.log(chalk.magenta.bold(`\n${'='.repeat(60)}\n${text}\n${'='.repeat(60)}\n`)),
  step: (text) => console.log(chalk.cyan(`► ${text}`)),
  success: (text) => console.log(chalk.green(`✓ ${text}`)),
  error: (text) => console.log(chalk.red(`✗ ${text}`)),
  warning: (text) => console.log(chalk.yellow(`⚠ ${text}`)),
  info: (text) => console.log(chalk.blue(`ℹ ${text}`)),
  url: (label, url) => console.log(chalk.cyan(`${label}:`), chalk.underline(url))
};

module.exports = {
  commandExists,
  getPythonCommand,
  getVenvPaths,
  runCommand,
  runCommandSilent,
  spawnBackground,
  waitForPort,
  print
};

