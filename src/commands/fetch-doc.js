/**
 * Fetch Documentation Command
 * Downloads Lexia SDK documentation based on project type
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const https = require('https');
const { DOCS_URLS } = require('../config');

// Map project types to config keys
const DOCS_MAP = {
  python: DOCS_URLS.PYTHON,
  nodejs: DOCS_URLS.NODEJS
};

/**
 * Detect project type based on files in current directory
 * @returns {Promise<string|null>} 'python', 'nodejs', or null
 */
async function detectProjectType() {
  try {
    const files = await fs.readdir(process.cwd());
    
    // Check for Python project indicators
    const hasPythonFiles = files.some(file => 
      file === 'requirements.txt' || 
      file === 'setup.py' || 
      file === 'pyproject.toml' ||
      file === 'Pipfile'
    );
    
    if (hasPythonFiles) {
      return 'python';
    }
    
    // Check for Node.js project indicators
    const hasNodeFiles = files.some(file => 
      file === 'package.json' || 
      file === 'package-lock.json' ||
      file === 'yarn.lock'
    );
    
    if (hasNodeFiles) {
      return 'nodejs';
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Check if we're in a project root directory
 * @returns {Promise<{isRoot: boolean, detectedType: string|null}>}
 */
async function checkProjectRoot() {
  const detectedType = await detectProjectType();
  return {
    isRoot: detectedType !== null,
    detectedType
  };
}

/**
 * Download file from URL
 * @param {string} url - URL to download from
 * @param {string} destPath - Destination path
 * @returns {Promise<void>}
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirects
        downloadFile(response.headers.location, destPath)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }
      
      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', async () => {
        try {
          await fs.writeFile(destPath, data, 'utf8');
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Ensure docs directory exists
 * @returns {Promise<string>} Path to docs directory
 */
async function ensureDocsDirectory() {
  const docsPath = path.join(process.cwd(), 'docs');
  
  try {
    await fs.access(docsPath);
  } catch (error) {
    // Directory doesn't exist, create it
    await fs.mkdir(docsPath, { recursive: true });
    console.log(chalk.green('✓ Created docs directory'));
  }
  
  return docsPath;
}

/**
 * Download documentation for a specific type
 * @param {string} type - 'python' or 'nodejs'
 * @returns {Promise<void>}
 */
async function downloadDocumentation(type) {
  const spinner = ora(`Downloading Lexia ${type === 'python' ? 'Python' : 'Node.js'} SDK documentation...`).start();
  
  try {
    const docsPath = await ensureDocsDirectory();
    const fileName = type === 'python' ? 'LEXIA_PYTHON_SDK.md' : 'LEXIA_NODEJS_SDK.md';
    const filePath = path.join(docsPath, fileName);
    
    await downloadFile(DOCS_MAP[type], filePath);
    
    spinner.succeed(chalk.green('Documentation downloaded successfully!'));
    
    console.log(chalk.cyan('\n============================================================'));
    console.log(chalk.green('✓ Documentation Ready'));
    console.log(chalk.cyan('============================================================'));
    console.log(chalk.white('📄 File:'), chalk.yellow(path.relative(process.cwd(), filePath)));
    console.log(chalk.white('📦 Type:'), chalk.yellow(type === 'python' ? 'Python SDK' : 'Node.js SDK'));
    console.log(chalk.white('📂 Location:'), chalk.yellow(docsPath));
    console.log(chalk.cyan('============================================================\n'));
    
    return filePath;
  } catch (error) {
    spinner.fail(chalk.red('Failed to download documentation'));
    throw error;
  }
}

/**
 * Main fetch-doc command
 */
async function fetchDoc() {
  try {
    console.log(chalk.cyan('\n============================================================'));
    console.log(chalk.cyan('📚 Lexia - Fetch Documentation'));
    console.log(chalk.cyan('============================================================\n'));
    
    // Check if we're in a project root
    const { isRoot, detectedType } = await checkProjectRoot();
    
    let selectedType;
    
    if (!isRoot) {
      // Not in project root - show warning and ask user
      console.log(chalk.yellow('⚠ Warning: Could not detect project type'));
      console.log(chalk.white('We recommend running this command in the root directory of your project.'));
      console.log(chalk.gray('(Looking for requirements.txt, package.json, etc.)\n'));
      
      const { choice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'choice',
          message: 'Which documentation would you like to download?',
          choices: [
            { name: '🐍 Python SDK Documentation', value: 'python' },
            { name: '📦 Node.js SDK Documentation', value: 'nodejs' },
            { name: '❌ Skip, cancel', value: 'none' }
          ]
        }
      ]);
      
      if (choice === 'none') {
        console.log(chalk.yellow('\n⚠ Cancelled\n'));
        return;
      }
      
      selectedType = choice;
    } else {
      // In project root - auto-detect
      console.log(chalk.green('✓ Project detected:'), chalk.yellow(detectedType === 'python' ? 'Python' : 'Node.js'));
      console.log();
      
      selectedType = detectedType;
    }
    
    // Download documentation
    await downloadDocumentation(selectedType);
    
  } catch (error) {
    console.log(chalk.red(`\n✗ Error: ${error.message}\n`));
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(1);
  }
}

module.exports = fetchDoc;

