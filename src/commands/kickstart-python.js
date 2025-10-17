/**
 * Kickstart command - Quick setup for a new Lexia project
 */

const path = require('path');
const fs = require('fs').promises;
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const simpleGit = require('simple-git');
const {
  commandExists,
  getPythonCommand,
  getVenvPaths,
  runCommand,
  runCommandSilent,
  spawnBackground,
  waitForPort,
  print
} = require('../utils');

const REPO_URL = 'https://github.com/Xalantico/lexia-starter-kit-python-v1';

/**
 * Check all prerequisites
 */
async function checkPrerequisites() {
  const spinner = ora('Checking prerequisites...').start();
  const missing = [];

  try {
    // Check Python
    const pythonCmd = await getPythonCommand();
    if (!pythonCmd) {
      missing.push('Python 3.8+');
      spinner.warn(chalk.yellow('Python not found'));
    } else {
      spinner.succeed(chalk.green(`Python found: ${pythonCmd}`));
    }

    // Check Git
    spinner.start('Checking Git...');
    if (await commandExists('git')) {
      spinner.succeed(chalk.green('Git found'));
    } else {
      missing.push('Git');
      spinner.warn(chalk.yellow('Git not found'));
    }

    // Check Node.js/npm
    spinner.start('Checking Node.js...');
    if (await commandExists('node') && await commandExists('npm')) {
      spinner.succeed(chalk.green('Node.js/npm found'));
    } else {
      missing.push('Node.js/npm');
      spinner.warn(chalk.yellow('Node.js/npm not found'));
    }

    // Check npx
    spinner.start('Checking npx...');
    if (await commandExists('npx')) {
      spinner.succeed(chalk.green('npx found'));
    } else {
      missing.push('npx');
      spinner.warn(chalk.yellow('npx not found'));
    }

    if (missing.length > 0) {
      spinner.stop();
      print.error('Missing prerequisites:');
      missing.forEach(item => console.log(`  - ${item}`));
      console.log();
      print.info('Please install the missing prerequisites:');
      console.log('  - Python: https://www.python.org/downloads/');
      console.log('  - Git: https://git-scm.com/downloads');
      console.log('  - Node.js: https://nodejs.org/\n');
      process.exit(1);
    }

    spinner.stop();
    return await getPythonCommand();
  } catch (error) {
    spinner.fail('Failed to check prerequisites');
    throw error;
  }
}

/**
 * Clone repository
 */
async function cloneRepository(directory) {
  const spinner = ora('Cloning Lexia starter kit from GitHub...').start();
  
  try {
    const git = simpleGit();
    await git.clone(REPO_URL, directory);
    spinner.succeed(chalk.green('Repository cloned successfully'));
  } catch (error) {
    spinner.fail('Failed to clone repository');
    throw error;
  }
}

/**
 * Create virtual environment
 */
async function createVirtualEnv(projectPath, pythonCmd) {
  const spinner = ora('Creating Python virtual environment...').start();
  
  try {
    await runCommandSilent(pythonCmd, ['-m', 'venv', 'lexia_env'], {
      cwd: projectPath
    });
    spinner.succeed(chalk.green('Virtual environment created'));
  } catch (error) {
    spinner.fail('Failed to create virtual environment');
    throw error;
  }
}

/**
 * Install dependencies
 */
async function installDependencies(projectPath) {
  const spinner = ora('Installing Python dependencies...').start();
  
  try {
    const venvPaths = getVenvPaths();
    const pipPath = path.join(projectPath, venvPaths.pip);
    
    await runCommandSilent(pipPath, ['install', '-r', 'requirements.txt'], {
      cwd: projectPath
    });
    
    spinner.succeed(chalk.green('Dependencies installed'));
  } catch (error) {
    spinner.fail('Failed to install dependencies');
    throw error;
  }
}

/**
 * Start backend server
 */
async function startBackend(projectPath, agentPort) {
  const spinner = ora(`Starting agent server on port ${agentPort}...`).start();
  
  try {
    const venvPaths = getVenvPaths();
    const pythonPath = path.join(projectPath, venvPaths.python);
    
    const backendProcess = spawnBackground(pythonPath, ['main.py', '--dev'], {
      cwd: projectPath,
      env: { ...process.env, PORT: agentPort }
    });

    // Wait a bit for the server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if process is still running
    if (backendProcess.exitCode !== null) {
      throw new Error('Backend process exited immediately');
    }

    spinner.succeed(chalk.green(`Agent started (PID: ${backendProcess.pid})`));
    return backendProcess;
  } catch (error) {
    spinner.fail('Failed to start agent');
    throw error;
  }
}

/**
 * Start frontend server
 */
async function startFrontend(projectPath, port, agentPort) {
  const spinner = ora(`Starting Lexia-UI server on port ${port}...`).start();
  
  try {
    const tryStart = async (pkgOrBin) => {
      const proc = spawnBackground('npx', [
        '-y',
        pkgOrBin,
        `--port=${port}`,
        `--agent-port=${agentPort}`
      ], { cwd: projectPath });
      // Wait for frontend to start
      await new Promise(resolve => setTimeout(resolve, 3000));
      if (proc.exitCode !== null) {
        throw new Error(`Frontend process exited immediately (${pkgOrBin})`);
      }
      return proc;
    };

    let frontendProcess;
    try {
      // Prefer new bin name
      frontendProcess = await tryStart('lexia-ui');
    } catch (_) {
      // Fallback to package name
      frontendProcess = await tryStart('@lexia/ui');
    }

    spinner.succeed(chalk.green(`Lexia-UI started (PID: ${frontendProcess.pid})`));
    return frontendProcess;
  } catch (error) {
    spinner.fail('Failed to start Lexia-UI');
    throw error;
  }
}

/**
 * Main kickstart command
 */
async function kickstart(options) {
  try {
    const { directory, port, agentPort, start } = options;
    
    print.title('🚀 Lexia Kickstart - Python');

    // Check prerequisites
    const pythonCmd = await checkPrerequisites();

    // Check if directory exists
    const projectPath = path.resolve(process.cwd(), directory);
    
    try {
      await fs.access(projectPath);
      print.error(`Directory '${directory}' already exists`);
      
      const { shouldRemove } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'shouldRemove',
          message: 'Do you want to remove it and continue?',
          default: false
        }
      ]);

      if (!shouldRemove) {
        process.exit(1);
      }

      await fs.rm(projectPath, { recursive: true, force: true });
    } catch (error) {
      // Directory doesn't exist, which is fine
    }

    // Create directory
    print.step(`Creating directory: ${directory}`);
    await fs.mkdir(projectPath, { recursive: true });
    print.success(`Created directory: ${projectPath}`);

    // Clone repository
    await cloneRepository(projectPath);

    // Create virtual environment
    await createVirtualEnv(projectPath, pythonCmd);

    // Install dependencies
    await installDependencies(projectPath);

    // Setup complete
    print.title('✓ Setup completed successfully!');

    // Ask to start servers
    const shouldStart = start !== false ? await inquirer.prompt([
      {
        type: 'confirm',
        name: 'start',
        message: 'Do you want to start the backend and frontend servers now?',
        default: true
      }
    ]).then(answers => answers.start) : false;

    if (!shouldStart) {
      console.log();
      print.info('To start manually:');
      console.log(chalk.gray(`  cd ${directory}`));
      console.log(chalk.gray(`  ${getVenvPaths().activate}`));
      console.log(chalk.gray(`  python main.py --dev`));
      console.log(chalk.gray(`  # In another terminal:`));
      console.log(chalk.gray(`  npx -y @lexia/ui lexia --port=${port} --agent-port=${agentPort}`));
      console.log();
      return;
    }

    // Start servers
    console.log();
    const backendProcess = await startBackend(projectPath, agentPort);
    const frontendProcess = await startFrontend(projectPath, port, agentPort);

    // Display success message
    print.title('🎉 Lexia is running!');
    print.url('Lexia-UI', `http://localhost:${port}`);
    print.url('Agent   ', `http://localhost:${agentPort}`);
    console.log();
    print.warning('Press Ctrl+C to stop both servers');
    console.log();

    // Handle graceful shutdown
    const shutdown = () => {
      console.log();
      print.step('Shutting down servers...');
      
      if (backendProcess && !backendProcess.killed) {
        backendProcess.kill();
      }
      if (frontendProcess && !frontendProcess.killed) {
        frontendProcess.kill();
      }

      setTimeout(() => {
        print.success('Servers stopped');
        process.exit(0);
      }, 1000);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Monitor processes
    backendProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        print.error('Agent stopped unexpectedly');
        if (frontendProcess && !frontendProcess.killed) {
          frontendProcess.kill();
        }
        process.exit(1);
      }
    });

    frontendProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        print.error('Lexia-UI stopped unexpectedly');
        if (backendProcess && !backendProcess.killed) {
          backendProcess.kill();
        }
        process.exit(1);
      }
    });

    // Keep process alive
    await new Promise(() => {});

  } catch (error) {
    print.error(`Failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

module.exports = kickstart;

