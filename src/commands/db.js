/**
 * Lexia Database Commands
 * Manage PostgreSQL databases via Lexia Deploy API
 */

const chalk = require('chalk');
const ora = require('ora');
const https = require('https');
const http = require('http');
const { getCredentials } = require('./login');
const { API_BASE_URL, API_ENDPOINTS } = require('../config');

/**
 * Make API request to Lexia Deploy API
 */
function makeApiRequest(method, path, credentials) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE_URL);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: method,
      headers: {
        'x-workspace': credentials.workspace,
        'x-token': credentials.token,
        'Content-Type': 'application/json',
        'x-mode' : credentials.mode
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
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject({ statusCode: res.statusCode, response });
          }
        } catch (error) {
          reject(new Error(`Invalid response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

/**
 * DB Create Command - Create a new PostgreSQL database
 */
async function dbCreate(options) {
  console.log(chalk.cyan('\n============================================================'));
  console.log(chalk.cyan('🗄️  Creating PostgreSQL Database'));
  console.log(chalk.cyan('============================================================\n'));

  // Get credentials from login
  const credentials = getCredentials();
  if (!credentials) {
    console.log(chalk.red('✗ Not authenticated'));
    console.log(chalk.cyan('Please run:'), chalk.yellow('lexia login'), chalk.cyan('first\n'));
    process.exit(1);
  }

  console.log(chalk.white('Workspace:'), chalk.yellow(credentials.workspace));
  console.log(chalk.white('API:      '), chalk.yellow(API_BASE_URL));

  const spinner = ora('Creating database...').start();

  try {
    // Hybrid DB API endpoint: creates/uses workspace DB and creates a schema
    const response = await makeApiRequest('POST', API_ENDPOINTS.DB_CREATE, credentials);

    spinner.succeed(chalk.green('Database created successfully!'));

    console.log(chalk.cyan('\n============================================================'));
    console.log(chalk.green('✓ Database Ready'));
    console.log(chalk.cyan('============================================================'));
    // Show actual DB and schema
    console.log(chalk.white('Database:  '), chalk.yellow(response.database_name));
    console.log(chalk.white('Schema:    '), chalk.yellow(response.schema_name));
    console.log(chalk.white('Username:  '), chalk.yellow(response.username));
    console.log(chalk.white('Password:  '), chalk.yellow(response.password));
    console.log(chalk.white('Workspace: '), chalk.yellow(response.workspace_name));
    
    console.log(chalk.cyan('\n📋 Connection String:'));
    // Use the connection string from the response if available
    const connString = response.connection_info?.connection_string || 
      `postgresql://${response.username}:${response.password}@localhost:6432/${response.database_name}?options=-csearch_path%3D${response.schema_name}`;
    console.log(chalk.yellow(`   ${connString}`));
    
    console.log(chalk.cyan('\n💡 Save these credentials - they won\'t be shown again!'));
    console.log(chalk.cyan('============================================================\n'));

  } catch (error) {
    spinner.fail(chalk.red('Failed to create database'));
    
    if (error.statusCode === 401) {
      console.log(chalk.red('\n✗ Authentication failed'));
      console.log(chalk.yellow('Your session may have expired. Please run:'), chalk.white('lexia login\n'));
    } else if (error.response && error.response.detail) {
      console.log(chalk.red(`\n✗ ${error.response.detail}\n`));
    } else {
      console.log(chalk.red(`\n✗ ${error.message}\n`));
    }
    process.exit(1);
  }
}

/**
 * DB List Command - List all databases for workspace
 */
async function dbList() {
  console.log(chalk.cyan('\n============================================================'));
  console.log(chalk.cyan('📋 Listing Databases'));
  console.log(chalk.cyan('============================================================\n'));

  // Get credentials from login
  const credentials = getCredentials();
  if (!credentials) {
    console.log(chalk.red('✗ Not authenticated'));
    console.log(chalk.cyan('Please run:'), chalk.yellow('lexia login'), chalk.cyan('first\n'));
    process.exit(1);
  }

  console.log(chalk.white('Workspace:'), chalk.yellow(credentials.workspace));

  const spinner = ora('Fetching databases...').start();

  try {
    // DB API endpoint (returns list of { database_name, schema_name })
    const response = await makeApiRequest('GET', API_ENDPOINTS.DB_LIST, credentials);

    spinner.succeed(chalk.green('Databases retrieved'));

    console.log(chalk.cyan('\n============================================================'));
    
    if (response.count === 0) {
      console.log(chalk.yellow('No databases found'));
      console.log(chalk.cyan('\nCreate one with:'), chalk.white('lexia db create --postgres'));
    } else {
      console.log(chalk.green(`✓ Found ${response.count} database${response.count > 1 ? 's' : ''}`));
      console.log(chalk.cyan('============================================================\n'));
      
      // Show schemas as databases to avoid confusion
      const items = response.databases || response.schemas || [];
      items.forEach((item, index) => {
        const name = typeof item === 'string' ? item : (item.schema_name || item.database_name);
        console.log(chalk.white(`  ${index + 1}. ${name}`));
      });
    }
    
    console.log(chalk.cyan('============================================================\n'));

  } catch (error) {
    spinner.fail(chalk.red('Failed to list databases'));
    
    if (error.statusCode === 401) {
      console.log(chalk.red('\n✗ Authentication failed'));
      console.log(chalk.yellow('Your session may have expired. Please run:'), chalk.white('lexia login\n'));
    } else if (error.response && error.response.detail) {
      console.log(chalk.red(`\n✗ ${error.response.detail}\n`));
    } else {
      console.log(chalk.red(`\n✗ ${error.message}\n`));
    }
    process.exit(1);
  }
}

/**
 * DB Remove Command - Delete a database
 */
async function dbRemove(databaseName) {
  if (!databaseName) {
    console.log(chalk.red('\n✗ Database name is required'));
    console.log(chalk.cyan('Usage:'), chalk.white('lexia db remove <database-name>\n'));
    process.exit(1);
  }

  console.log(chalk.cyan('\n============================================================'));
  console.log(chalk.cyan('🗑️  Removing Database'));
  console.log(chalk.cyan('============================================================\n'));

  // Get credentials from login
  const credentials = getCredentials();
  if (!credentials) {
    console.log(chalk.red('✗ Not authenticated'));
    console.log(chalk.cyan('Please run:'), chalk.yellow('lexia login'), chalk.cyan('first\n'));
    process.exit(1);
  }

  console.log(chalk.white('Database: '), chalk.yellow(databaseName));
  console.log(chalk.white('Workspace:'), chalk.yellow(credentials.workspace));

  const spinner = ora('Deleting database...').start();

  try {
    // Delete a single schema under the workspace database
    const response = await makeApiRequest('DELETE', `${API_ENDPOINTS.DB_DELETE}/${databaseName}`, credentials);

    spinner.succeed(chalk.green('Database deleted successfully!'));

    console.log(chalk.cyan('\n============================================================'));
    console.log(chalk.green('✓ Database Removed'));
    console.log(chalk.cyan('============================================================'));
    // Present schema as database name
    console.log(chalk.white('Database:  '), chalk.yellow(response.schema_name || databaseName));
    console.log(chalk.white('Workspace: '), chalk.yellow(response.workspace_name));
    console.log(chalk.cyan('============================================================\n'));

  } catch (error) {
    spinner.fail(chalk.red('Failed to delete database'));
    
    if (error.statusCode === 401) {
      console.log(chalk.red('\n✗ Authentication failed'));
      console.log(chalk.yellow('Your session may have expired. Please run:'), chalk.white('lexia login\n'));
    } else if (error.statusCode === 404) {
      console.log(chalk.red(`\n✗ Database '${databaseName}' not found or doesn't belong to your workspace\n`));
    } else if (error.response && error.response.detail) {
      console.log(chalk.red(`\n✗ ${error.response.detail}\n`));
    } else {
      console.log(chalk.red(`\n✗ ${error.message}\n`));
    }
    process.exit(1);
  }
}

module.exports = {
  dbCreate,
  dbList,
  dbRemove
};

