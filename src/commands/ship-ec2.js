const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { getCredentials } = require('./login');
const { API_BASE_URL, API_ENDPOINTS } = require('../config');
const { handleError } = require('../utils/errorHandler');
const {
  checkDockerInstalled,
  checkDockerImage,
  dockerLogin,
  dockerTag,
  dockerPush
} = require('../utils/docker-helper');

function requireAuth() {
  const credentials = getCredentials();
  if (!credentials) {
    console.log(chalk.red('\n✗ Not authenticated'));
    console.log(chalk.cyan('Please run:'), chalk.yellow('orca login'), chalk.cyan('first (fallback: orcapt login)\n'));
    process.exit(1);
  }
  return credentials;
}

function makeApiRequest(method, endpoint, credentials, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, API_BASE_URL);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      method,
      headers: {
        'X-Workspace': credentials.token,
        'X-Tenant': credentials.tenant || credentials.workspace,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = httpModule.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const response = data ? JSON.parse(data) : {};
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

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function parseEnvVars(options = {}) {
  const environmentVars = {};

  if (options.envFile) {
    const envFilePath = path.resolve(process.cwd(), options.envFile);
    if (!fs.existsSync(envFilePath)) {
      throw new Error(`Environment file not found: ${envFilePath}`);
    }

    const envFileContent = fs.readFileSync(envFilePath, 'utf8');
    envFileContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return;
      }

      const [key, ...valueParts] = trimmed.split('=');
      if (!key || valueParts.length === 0) {
        return;
      }
      let value = valueParts.join('=').trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      environmentVars[key.trim()] = value;
    });
  }

  if (Array.isArray(options.env)) {
    options.env.forEach((envStr) => {
      const [key, ...valueParts] = String(envStr).split('=');
      if (key && valueParts.length > 0) {
        environmentVars[key.trim()] = valueParts.join('=').trim();
      }
    });
  }

  return environmentVars;
}

async function ec2Deploy(appName, options = {}) {
  const credentials = requireAuth();

  if (!options.image) {
    console.log(chalk.red('\n✗ Docker image is required'));
    console.log(chalk.cyan('Usage:'), chalk.white('orca ship ec2 deploy <app-name> --image <docker-image>\n'));
    process.exit(1);
  }

  const spinner = ora('Queueing EC2 deployment...').start();
  try {
    const environmentVars = parseEnvVars(options);
    const ports = Array.isArray(options.port) ? options.port : [];
    let deployImage = options.image;

    if (options.push) {
      spinner.text = 'Preparing Docker Hub target...';
      const prepareResponse = await makeApiRequest(
        'POST',
        API_ENDPOINTS.EC2_PREPARE_PUSH,
        credentials,
        {
          app_name: appName,
          source_image: options.image,
          tag: options.tag || null
        }
      );

      const targetImage = prepareResponse.target_image;
      if (!targetImage) {
        throw new Error('API did not return a target image for push');
      }
      const dockerUsername = prepareResponse.docker_username || null;
      const dockerToken = prepareResponse.docker_token || null;
      if (!dockerUsername || !dockerToken) {
        throw new Error('API did not return Docker Hub credentials for push');
      }

      spinner.text = 'Checking local Docker image...';
      await checkDockerInstalled();
      const imageExists = await checkDockerImage(options.image);
      if (!imageExists) {
        throw new Error(`Local Docker image not found: ${options.image}`);
      }

      spinner.text = 'Logging in to Docker Hub...';
      await dockerLogin('docker.io', dockerUsername, dockerToken, 2);

      spinner.text = `Tagging image as ${targetImage}...`;
      await dockerTag(options.image, targetImage);

      spinner.text = 'Pushing image to Docker Hub...';
      await dockerPush(targetImage, (percent) => {
        spinner.text = `Pushing image to Docker Hub... ${percent}%`;
      });

      deployImage = targetImage;
    }

    const response = await makeApiRequest(
      'POST',
      API_ENDPOINTS.EC2_DEPLOY,
      credentials,
      {
        app_name: appName,
        image: deployImage,
        container_name: options.containerName || null,
        ports,
        environment_vars: environmentVars,
        command: options.command || null
      }
    );

    spinner.succeed(chalk.green('Deployment queued'));
    console.log(chalk.cyan('\n============================================================'));
    console.log(chalk.green('✓ EC2 deployment accepted'));
    console.log(chalk.cyan('============================================================'));
    console.log(chalk.white('Deployment ID:'), chalk.yellow(response.deployment_id));
    console.log(chalk.white('Status:       '), chalk.yellow(response.status));
    console.log(chalk.white('Image:        '), chalk.yellow(deployImage));
    console.log(chalk.cyan('\nNext commands:'));
    console.log(chalk.white('  Status:'), chalk.cyan(`orca ship ec2 status ${response.deployment_id}`));
    console.log(chalk.white('  Logs:  '), chalk.cyan(`orca ship ec2 logs ${response.deployment_id}`));
    console.log(chalk.cyan('============================================================\n'));
  } catch (error) {
    spinner.fail(chalk.red('Failed to queue deployment'));
    handleError(error, 'EC2 deployment');
    process.exit(1);
  }
}

async function ec2Status(deploymentId) {
  const credentials = requireAuth();
  const spinner = ora('Fetching deployment status...').start();

  try {
    const endpoint = API_ENDPOINTS.EC2_STATUS.replace('{deploymentId}', deploymentId);
    const response = await makeApiRequest('GET', endpoint, credentials);
    spinner.succeed(chalk.green('Status fetched'));

    console.log(chalk.cyan('\n============================================================'));
    console.log(chalk.green('✓ EC2 deployment status'));
    console.log(chalk.cyan('============================================================'));
    console.log(chalk.white('Deployment ID:   '), chalk.yellow(response.id));
    console.log(chalk.white('App Name:        '), chalk.yellow(response.app_name));
    console.log(chalk.white('Image:           '), chalk.yellow(response.image));
    console.log(chalk.white('Container:       '), chalk.yellow(response.container_name || '-'));
    console.log(chalk.white('Runner:          '), chalk.yellow(response.runner_id || '-'));
    console.log(chalk.white('Status:          '), chalk.yellow(response.status));
    console.log(chalk.white('Last Heartbeat:  '), chalk.yellow(response.last_heartbeat_at || '-'));
    if (response.last_error) {
      console.log(chalk.white('Last Error:      '), chalk.red(response.last_error));
    }
    console.log(chalk.cyan('============================================================\n'));
  } catch (error) {
    spinner.fail(chalk.red('Failed to fetch status'));
    handleError(error, 'EC2 deployment status');
    process.exit(1);
  }
}

async function ec2Logs(deploymentId, options = {}) {
  const credentials = requireAuth();
  const spinner = ora('Fetching deployment logs...').start();

  try {
    const endpoint = API_ENDPOINTS.EC2_LOGS.replace('{deploymentId}', deploymentId);
    const params = new URLSearchParams();
    if (options.page) params.set('page', String(options.page));
    if (options.perPage) params.set('per_page', String(options.perPage));

    const fullEndpoint = params.toString() ? `${endpoint}?${params.toString()}` : endpoint;
    const response = await makeApiRequest('GET', fullEndpoint, credentials);
    spinner.succeed(chalk.green('Logs fetched'));

    console.log(chalk.cyan('\n============================================================'));
    console.log(chalk.green('✓ EC2 deployment logs'));
    console.log(chalk.cyan('============================================================'));

    if (!Array.isArray(response.logs) || response.logs.length === 0) {
      console.log(chalk.yellow('No logs yet.'));
    } else {
      response.logs.forEach((logEntry) => {
        const timestamp = logEntry.created_at ? new Date(logEntry.created_at).toLocaleString() : '-';
        const level = String(logEntry.log_level || 'info').toUpperCase();
        console.log(chalk.gray(`[${timestamp}]`), chalk.yellow(level), chalk.white(logEntry.message));
      });
    }

    if (response.pagination) {
      console.log(chalk.cyan('\n------------------------------------------------------------'));
      console.log(
        chalk.white('Page'),
        chalk.yellow(`${response.pagination.current_page}/${response.pagination.total_pages}`),
        chalk.white('Total'),
        chalk.yellow(response.pagination.total)
      );
    }

    console.log(chalk.cyan('============================================================\n'));
  } catch (error) {
    spinner.fail(chalk.red('Failed to fetch logs'));
    handleError(error, 'EC2 deployment logs');
    process.exit(1);
  }
}

module.exports = {
  ec2Deploy,
  ec2Status,
  ec2Logs
};
