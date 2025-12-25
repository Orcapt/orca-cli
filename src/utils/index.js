/**
 * Utility functions for orcapt CLI
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
    python: isWindows ? 'orca_env\\Scripts\\python.exe' : 'orca_env/bin/python',
    pip: isWindows ? 'orca_env\\Scripts\\pip.exe' : 'orca_env/bin/pip',
    activate: isWindows ? 'orca_env\\Scripts\\activate' : 'source orca_env/bin/activate'
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
 * Check if a port is in use
 * @param {number} port - Port to check
 * @returns {Promise<boolean>}
 */
async function isPortInUse(port) {
  const net = require('net');
  
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    
    server.listen(port, '127.0.0.1');
  });
}

/**
 * Kill process using a specific port
 * @param {number} port - Port number
 * @returns {Promise<boolean>} True if a process was killed
 */
async function killPort(port) {
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);
  
  try {
    const isWindows = process.platform === 'win32';
    const isMac = process.platform === 'darwin';
    
    if (isWindows) {
      // Windows: Find and kill process using the port
      try {
        const { stdout } = await execPromise(`netstat -ano | findstr :${port}`);
        const lines = stdout.trim().split('\n');
        const pids = new Set();
        
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0') {
            pids.add(pid);
          }
        }
        
        for (const pid of pids) {
          try {
            await execPromise(`taskkill /F /PID ${pid}`);
          } catch (e) {
            // Process might already be dead
          }
        }
        
        return pids.size > 0;
      } catch (error) {
        return false;
      }
    } else if (isMac) {
      // macOS: Use lsof to find and kill process
      try {
        const { stdout } = await execPromise(`lsof -ti:${port}`);
        const pids = stdout.trim().split('\n').filter(pid => pid);
        
        for (const pid of pids) {
          try {
            await execPromise(`kill -9 ${pid}`);
          } catch (e) {
            // Process might already be dead
          }
        }
        
        return pids.length > 0;
      } catch (error) {
        return false;
      }
    } else {
      // Linux: Use fuser or lsof
      try {
        const { stdout } = await execPromise(`lsof -ti:${port} 2>/dev/null || fuser ${port}/tcp 2>/dev/null`);
        const pids = stdout.trim().split(/\s+/).filter(pid => pid);
        
        for (const pid of pids) {
          try {
            await execPromise(`kill -9 ${pid}`);
          } catch (e) {
            // Process might already be dead
          }
        }
        
        return pids.length > 0;
      } catch (error) {
        return false;
      }
    }
  } catch (error) {
    return false;
  }
}

/**
 * Ensure port is available by killing any process using it
 * @param {number} port - Port to check and free
 * @param {string} portName - Name for logging (e.g., 'UI', 'Agent')
 * @returns {Promise<void>}
 */
async function ensurePortAvailable(port, portName = 'Port') {
  const chalk = require('chalk');
  
  if (await isPortInUse(port)) {
    console.log(chalk.yellow(`⚠ ${portName} port ${port} is in use, killing the process...`));
    const killed = await killPort(port);
    
    if (killed) {
      console.log(chalk.green(`✓ Freed port ${port}`));
      // Wait a moment for the port to be fully released
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log(chalk.yellow(`⚠ Could not kill process on port ${port}, will try to start anyway...`));
    }
  }
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
  isPortInUse,
  killPort,
  ensurePortAvailable,
  print
};

