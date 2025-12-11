/**
 * Orca Login Command
 * Authenticates users before using kickstart commands
 */

const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');
const { API_BASE_URL, API_ENDPOINTS } = require('../config');

// Config file location in user's home directory
const CONFIG_DIR = path.join(os.homedir(), '.orca');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/**
 * Make API request to authenticate
 */
function authenticate(mode, workspace, token) {
  return new Promise((resolve, reject) => {
    // Parse API URL from config
    const apiUrl = new URL(API_ENDPOINTS.AUTH, API_BASE_URL);
    const hostname = apiUrl.hostname;
    const pathName = apiUrl.pathname;
    const isHttps = apiUrl.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    // Map legacy 'dev' selection to 'pro' for the API
    const modeValue = mode === 'team' ? 'team' : 'dev';

    const postData = JSON.stringify({
      workspace,
      token,
      mode: modeValue
    });

    const options = {
      hostname,
      port: apiUrl.port || (isHttps ? 443 : 80),
      path: pathName,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = httpModule.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.pass === true) {
            resolve(true);
          } else {
            resolve(false);
          }
        } catch (error) {
          reject(new Error('Invalid response from server'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Save credentials to config file
 */
function saveCredentials(mode, workspace, token) {
  try {
    // Create .orca directory if it doesn't exist
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    const config = {
      mode,
      workspace,
      token,
      authenticated: true,
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error(chalk.red('Failed to save credentials:', error.message));
    return false;
  }
}

/**
 * Login command handler
 */
async function login() {
  console.log(chalk.cyan('\n============================================================'));
  console.log(chalk.cyan('🔐 Orca Login'));
  console.log(chalk.cyan('============================================================\n'));

  let authenticated = false;
  let retryCount = 0;
  const MAX_RETRIES = 3;

  while (!authenticated && retryCount < MAX_RETRIES) {
    try {
      // Ask for mode
      const modeAnswer = await inquirer.prompt([
        {
          type: 'list',
          name: 'mode',
          message: 'Select your Orca mode:',
          choices: [
            { name: 'Sandbox/Pro mode', value: 'dev' },
            { name: 'Team mode', value: 'team' }
          ]
        }
      ]);

      // Ask for workspace name
      const workspaceAnswer = await inquirer.prompt([
        {
          type: 'input',
          name: 'workspace',
          message: 'Enter your workspace name:',
          validate: (input) => {
            if (input.trim().length === 0) {
              return 'Workspace name cannot be empty';
            }
            return true;
          }
        }
      ]);

      // Ask for token
      const tokenAnswer = await inquirer.prompt([
        {
          type: 'password',
          name: 'token',
          message: 'Enter your authentication token:',
          mask: '*',
          validate: (input) => {
            if (input.trim().length === 0) {
              return 'Token cannot be empty';
            }
            return true;
          }
        }
      ]);

      const spinner = ora('Authenticating...').start();

      try {
        const isAuthenticated = await authenticate(
          modeAnswer.mode,
          workspaceAnswer.workspace.trim(),
          tokenAnswer.token.trim()
        );

        if (isAuthenticated) {
          spinner.succeed(chalk.green('Authentication successful!'));
          
          // Save credentials
          const saved = saveCredentials(
            modeAnswer.mode,
            workspaceAnswer.workspace.trim(),
            tokenAnswer.token.trim()
          );

          if (saved) {
            console.log(chalk.green('\n✓ Credentials saved successfully'));
            console.log(chalk.cyan('\nYou can now use:'), chalk.white('orca kickstart <language>'));
            console.log(chalk.cyan('============================================================\n'));
          }

          authenticated = true;
        } else {
          spinner.fail(chalk.red('Authentication failed'));
          retryCount++;
          
          if (retryCount < MAX_RETRIES) {
            console.log(chalk.yellow(`\n⚠ Invalid credentials. Please try again (${retryCount}/${MAX_RETRIES})\n`));
          } else {
            console.log(chalk.red('\n✗ Maximum retry attempts reached. Please try again later.\n'));
          }
        }
      } catch (error) {
        spinner.fail(chalk.red('Authentication error'));
        console.log(chalk.red(`Error: ${error.message}`));
        retryCount++;
        
        if (retryCount < MAX_RETRIES) {
          console.log(chalk.yellow(`\n⚠ Please try again (${retryCount}/${MAX_RETRIES})\n`));
        }
      }
    } catch (error) {
      if (error.isTtyError) {
        console.error(chalk.red('Prompt couldn\'t be rendered in the current environment'));
      } else {
        console.error(chalk.red('An error occurred:', error.message));
      }
      break;
    }
  }

  if (!authenticated) {
    process.exit(1);
  }
}

/**
 * Check if user is logged in
 */
function isLoggedIn() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return false;
    }

    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    return config.authenticated === true;
  } catch (error) {
    return false;
  }
}

/**
 * Get current credentials
 */
function getCredentials() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch (error) {
    return null;
  }
}

/**
 * Clear credentials (logout)
 */
function clearCredentials() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
    }
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  login,
  isLoggedIn,
  getCredentials,
  clearCredentials,
  CONFIG_FILE
};

