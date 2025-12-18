/**
 * Kickstart command for Node.js - Quick setup for a new Orca Node.js project
 */

const path = require('path');
const fs = require('fs').promises;
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const simpleGit = require('simple-git');
const {
  commandExists,
  spawnBackground,
  ensurePortAvailable,
  print
} = require('../utils');
const { GITHUB_REPOS } = require('../config');

const REPO_URL = GITHUB_REPOS.NODE_STARTER;

/**
 * Check all prerequisites for Node.js
 */
async function checkPrerequisites() {
  const spinner = ora('Checking prerequisites...').start();
  const missing = [];

  try {
    // Check Node.js
    spinner.start('Checking Node.js...');
    if (await commandExists('node')) {
      spinner.succeed(chalk.green('Node.js found'));
    } else {
      missing.push('Node.js');
      spinner.warn(chalk.yellow('Node.js not found'));
    }

    // Check npm
    spinner.start('Checking npm...');
    if (await commandExists('npm')) {
      spinner.succeed(chalk.green('npm found'));
    } else {
      missing.push('npm');
      spinner.warn(chalk.yellow('npm not found'));
    }

    // Check Git
    spinner.start('Checking Git...');
    if (await commandExists('git')) {
      spinner.succeed(chalk.green('Git found'));
    } else {
      missing.push('Git');
      spinner.warn(chalk.yellow('Git not found'));
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
      console.log('  - Node.js: https://nodejs.org/');
      console.log('  - Git: https://git-scm.com/downloads\n');
      process.exit(1);
    }

    spinner.stop();
    return true;
  } catch (error) {
    spinner.fail('Failed to check prerequisites');
    throw error;
  }
}

/**
 * Clone repository
 */
async function cloneRepository(directory) {
  const spinner = ora('Cloning Orca Node.js starter kit from GitHub...').start();
  
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
 * Fix package.json to use npm packages instead of local file references
 */
async function fixPackageJson(projectPath) {
  const packageJsonPath = path.join(projectPath, 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  
  // Replace local file reference with npm package
  if (packageJson.dependencies && packageJson.dependencies['@orca/sdk']) {
    if (packageJson.dependencies['@orca/sdk'].startsWith('file:')) {
      packageJson.dependencies['@orca/sdk'] = '^1.0.0';
    }
  }
  
  await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
}

/**
 * Create memory directory with required files (not tracked by git)
 */
async function createMemoryModule(projectPath) {
  const memoryDir = path.join(projectPath, 'memory');
  await fs.mkdir(memoryDir, { recursive: true });
  
  // Create index.js
  const indexContent = `const { ConversationManager } = require('./conversation_manager');

module.exports = {
  ConversationManager
};
`;
  await fs.writeFile(path.join(memoryDir, 'index.js'), indexContent);
  
  // Create conversation_manager.js
  const conversationManagerContent = `/**
 * Conversation Manager
 * Handles conversation history and thread management
 */

class ConversationManager {
  constructor() {
    this.conversations = new Map();
    this.maxHistory = 20;
  }

  getConversation(threadId) {
    if (!this.conversations.has(threadId)) {
      this.conversations.set(threadId, []);
    }
    return this.conversations.get(threadId);
  }

  addMessage(threadId, role, content) {
    const conversation = this.getConversation(threadId);
    conversation.push({ role, content });
    
    // Keep only last maxHistory messages
    if (conversation.length > this.maxHistory) {
      conversation.splice(0, conversation.length - this.maxHistory);
    }
  }

  clearConversation(threadId) {
    this.conversations.delete(threadId);
  }

  getAllConversations() {
    return Array.from(this.conversations.keys());
  }
}

module.exports = { ConversationManager };
`;
  await fs.writeFile(path.join(memoryDir, 'conversation_manager.js'), conversationManagerContent);
}

/**
 * Install Node.js dependencies
 */
async function installDependencies(projectPath) {
  const spinner = ora('Installing Node.js dependencies...').start();
  
  try {
    // Fix package.json first
    await fixPackageJson(projectPath);
    
    // Note: memory module is now included in the GitHub repo, no need to create it
    
    const { spawn } = require('cross-spawn');
    
    await new Promise((resolve, reject) => {
      const npmProcess = spawn('npm', ['install'], {
        cwd: projectPath,
        stdio: 'pipe',
        shell: false
      });

      let output = '';
      let errorOutput = '';

      npmProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      npmProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      npmProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(errorOutput || output));
        }
      });

      npmProcess.on('error', (error) => {
        reject(error);
      });
    });
    
    spinner.succeed(chalk.green('Dependencies installed'));
  } catch (error) {
    spinner.fail('Failed to install dependencies');
    throw error;
  }
}

/**
 * Start Node.js agent server
 */
async function startAgent(projectPath, agentPort) {
  const spinner = ora(`Starting agent server on port ${agentPort}...`).start();
  
  try {
    const agentProcess = spawnBackground('node', ['main.js', '--dev'], {
      cwd: projectPath,
      env: { ...process.env, PORT: agentPort }
    });

    // Wait a bit for the server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if process is still running
    if (agentProcess.exitCode !== null) {
      throw new Error('Agent process exited immediately');
    }

    spinner.succeed(chalk.green(`Agent started (PID: ${agentProcess.pid})`));
    return agentProcess;
  } catch (error) {
    spinner.fail('Failed to start agent');
    throw error;
  }
}

/**
 * Start Orca-UI frontend server
 */
async function startUI(projectPath, port, agentPort) {
  const spinner = ora(`Starting Orca-UI server on port ${port}...`).start();
  
  try {
    const uiProcess = spawnBackground('npx', [
      '-y',
      '@orca/ui',
      'orca',
      `--port=${port}`,
      `--agent-port=${agentPort}`
    ], {
      cwd: projectPath
    });

    // Wait for UI to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if process is still running
    if (uiProcess.exitCode !== null) {
      throw new Error('Orca-UI process exited immediately');
    }

    spinner.succeed(chalk.green(`Orca-UI started (PID: ${uiProcess.pid})`));
    return uiProcess;
  } catch (error) {
    spinner.fail('Failed to start Orca-UI');
    throw error;
  }
}

/**
 * Main kickstart command for Node.js
 */
async function kickstartNode(options) {
  try {
    const { directory, port, agentPort, start } = options;
    
    print.title('🚀 Orca Kickstart - Node.js');

    // Check prerequisites
    await checkPrerequisites();

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

    // Install dependencies
    await installDependencies(projectPath);

    // Setup complete
    print.title('✓ Setup completed successfully!');

    // Ask to start servers
    const shouldStart = start !== false ? await inquirer.prompt([
      {
        type: 'confirm',
        name: 'start',
        message: 'Do you want to start the agent and Orca-UI servers now?',
        default: true
      }
    ]).then(answers => answers.start) : false;

    if (!shouldStart) {
      console.log();
      print.info('To start manually:');
      console.log(chalk.gray(`  cd ${directory}`));
      console.log(chalk.gray(`  node main.js --dev`));
      console.log(chalk.gray(`  # In another terminal:`));
      console.log(chalk.gray(`  npx -y @orca/ui orca --port=${port} --agent-port=${agentPort}`));
      console.log();
      return;
    }

    // Start servers
    console.log();
    // Ensure ports are available before starting
    await ensurePortAvailable(agentPort, 'Agent');
    await ensurePortAvailable(port, 'UI');
    
    const agentProcess = await startAgent(projectPath, agentPort);
    const uiProcess = await startUI(projectPath, port, agentPort);

    // Display success message
    print.title('🎉 Orca is running!');
    print.url('Orca-UI', `http://localhost:${port}`);
    print.url('Agent   ', `http://localhost:${agentPort}`);
    console.log();
    print.warning('Press Ctrl+C to stop both servers');
    console.log();

    // Handle graceful shutdown
    const shutdown = () => {
      console.log();
      print.step('Shutting down servers...');
      
      if (agentProcess && !agentProcess.killed) {
        agentProcess.kill();
      }
      if (uiProcess && !uiProcess.killed) {
        uiProcess.kill();
      }

      setTimeout(() => {
        print.success('Servers stopped');
        process.exit(0);
      }, 1000);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Monitor processes
    agentProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        print.error('Agent stopped unexpectedly');
        if (uiProcess && !uiProcess.killed) {
          uiProcess.kill();
        }
        process.exit(1);
      }
    });

    uiProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        print.error('Orca-UI stopped unexpectedly');
        if (agentProcess && !agentProcess.killed) {
          agentProcess.kill();
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

module.exports = kickstartNode;

