/**
 * Orcapt Lambda Commands
 * Deploy and manage Docker images on AWS Lambda
 */

const chalk = require('chalk');
const ora = require('ora');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { getCredentials } = require('./login');
const { API_BASE_URL, API_ENDPOINTS } = require('../config');
const { handleError } = require('../utils/errorHandler');
const {
  checkDockerInstalled,
  checkDockerImage,
  getImageSize,
  pushImageToECR
} = require('../utils/docker-helper');

/**
 * Make API request to Orcapt Deploy API
 */
function makeApiRequest(method, endpoint, credentials, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, API_BASE_URL);
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

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Check authentication
 */
function requireAuth() {
  const credentials = getCredentials();
  if (!credentials) {
    console.log(chalk.red('\n✗ Not authenticated'));
    console.log(chalk.cyan('Please run:'), chalk.yellow('orcapt login'), chalk.cyan('first\n'));
    process.exit(1);
  }
  return credentials;
}

/**
 * Lambda Deploy Command
 */
async function lambdaDeploy(functionName, options = {}) {
  console.log(chalk.cyan('\n============================================================'));
  console.log(chalk.cyan('🚀 Deploying Lambda Function'));
  console.log(chalk.cyan('============================================================\n'));

  const credentials = requireAuth();

  if (!options.image) {
    console.log(chalk.red('✗ Docker image is required'));
    console.log(chalk.cyan('Usage:'), chalk.white('orcapt lambda deploy <function-name> --image <docker-image>\n'));
    process.exit(1);
  }

  // Parse environment variables from array to object
  const environmentVars = {};
  
  // Read from .env file if provided
  if (options.envFile) {
    try {
      const envFilePath = path.resolve(process.cwd(), options.envFile);
      if (!fs.existsSync(envFilePath)) {
        console.log(chalk.red(`✗ Environment file not found: ${envFilePath}\n`));
        process.exit(1);
      }
      
      const envFileContent = fs.readFileSync(envFilePath, 'utf8');
      envFileContent.split('\n').forEach(line => {
        line = line.trim();
        // Skip empty lines and comments
        if (!line || line.startsWith('#')) return;
        
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          let value = valueParts.join('=').trim();
          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          environmentVars[key.trim()] = value;
        }
      });
    } catch (error) {
      console.log(chalk.red(`✗ Failed to read .env file: ${error.message}\n`));
      process.exit(1);
    }
  }
  
  // Parse from --env flags (these override .env file)
  if (options.env && Array.isArray(options.env)) {
    options.env.forEach(envStr => {
      const [key, ...valueParts] = envStr.split('=');
      if (key && valueParts.length > 0) {
        environmentVars[key.trim()] = valueParts.join('=').trim();
      }
    });
  }

  console.log(chalk.white('Function:  '), chalk.yellow(functionName));
  console.log(chalk.white('Image:     '), chalk.yellow(options.image));
  console.log(chalk.white('Memory:    '), chalk.yellow(`${options.memory || 512} MB`));
  console.log(chalk.white('Timeout:   '), chalk.yellow(`${options.timeout || 30}s`));
  console.log(chalk.white('Workspace: '), chalk.yellow(credentials.workspace));
  if (Object.keys(environmentVars).length > 0) {
    console.log(chalk.white('Env Vars:'));
    Object.entries(environmentVars).forEach(([key, value]) => {
      console.log(chalk.gray('           '), chalk.cyan(key) + chalk.gray('=') + chalk.yellow(value));
    });
  }
  console.log();

  try {
    // Step 1: Check if Docker is installed
    let spinner = ora('Step 1/9: Checking Docker...').start();
    await checkDockerInstalled();
    spinner.succeed(chalk.green('✓ Docker is installed and running'));

    // Step 2: Check if image exists locally
    spinner = ora('Step 2/9: Checking Docker image...').start();
    const imageExists = await checkDockerImage(options.image);
    if (!imageExists) {
      spinner.fail(chalk.red('✗ Docker image not found locally'));
      console.log(chalk.yellow('\nPlease build the image first:'));
      console.log(chalk.white('  docker build -t'), chalk.cyan(options.image), chalk.white('.'));
      console.log();
      process.exit(1);
    }
    const imageSize = await getImageSize(options.image);
    spinner.succeed(chalk.green(`✓ Found image '${options.image}' (${imageSize})`));

    // Step 3: Request ECR credentials from API
    spinner = ora('Step 3/9: Requesting ECR credentials...').start();
    
    let deploymentRequest;
    try {
      deploymentRequest = await makeApiRequest('POST', API_ENDPOINTS.LAMBDA_DEPLOY, credentials, {
        function_name: functionName,
        image_tag: options.image,
        memory_mb: options.memory || 512,
        timeout_seconds: options.timeout || 30,
        environment_vars: environmentVars
      });
    } catch (error) {
      spinner.fail(chalk.red('✗ Failed to request ECR credentials'));
      handleError(error, 'ECR credentials request');
      console.log();
      console.log(chalk.yellow('💡 Troubleshooting tips:'));
      console.log(chalk.white('  1. Check if backend is running'));
      console.log(chalk.white('  2. Verify your authentication: orcapt whoami'));
      console.log(chalk.white('  3. Check backend logs for errors'));
      console.log(chalk.white('  4. Ensure AWS credentials are configured in backend .env'));
      console.log();
      process.exit(1);
    }

    if (!deploymentRequest.ecr_url || !deploymentRequest.repository_uri) {
      spinner.fail(chalk.red('✗ Invalid response from API'));
      console.log(chalk.yellow('\nAPI Response:'), deploymentRequest);
      process.exit(1);
    }

    spinner.succeed(chalk.green('✓ ECR credentials received'));
    console.log(chalk.gray(`  Repository: ${deploymentRequest.repository_uri}`));

    // Step 4-6: Push image to ECR (handled by helper)
    const remoteImage = await pushImageToECR(
      options.image,
      deploymentRequest.ecr_url,
      deploymentRequest.ecr_username,
      deploymentRequest.ecr_password,
      deploymentRequest.repository_uri
    );

    // Step 7: Notify API that image is pushed
    spinner = ora('Step 7/9: Creating Lambda function...').start();
    const confirmResponse = await makeApiRequest(
      'POST',
      `${API_ENDPOINTS.LAMBDA_DEPLOY}/confirm`,
      credentials,
      {
        deployment_id: deploymentRequest.deployment_id,
        function_name: functionName,
        image_uri: remoteImage
      }
    );
    spinner.succeed(chalk.green('✓ Lambda function created'));

    // Step 8: Create API Gateway (if configured)
    if (confirmResponse.invoke_url) {
      spinner = ora('Step 8/9: Configuring API Gateway...').start();
      spinner.succeed(chalk.green('✓ API Gateway configured'));
    } else {
      console.log(chalk.gray('  ⓘ API Gateway not configured'));
    }

    // Step 9: Save to database
    spinner = ora('Step 9/9: Saving deployment info...').start();
    spinner.succeed(chalk.green('✓ Deployment completed'));

    // Success message
    console.log(chalk.cyan('\n============================================================'));
    console.log(chalk.green('✓ Function deployed successfully!'));
    console.log(chalk.cyan('============================================================\n'));

    console.log(chalk.white('Function Details:'));
    console.log(chalk.white('  Name:        '), chalk.yellow(functionName));
    console.log(chalk.white('  Image:       '), chalk.yellow(remoteImage));
    console.log(chalk.white('  Region:      '), chalk.yellow(confirmResponse.region || 'us-east-1'));
    console.log(chalk.white('  Memory:      '), chalk.yellow(`${options.memory || 512} MB`));
    console.log(chalk.white('  Timeout:     '), chalk.yellow(`${options.timeout || 30}s`));
    console.log(chalk.white('  Status:      '), chalk.green('Active'));

    if (confirmResponse.invoke_url) {
      console.log(chalk.cyan('\nInvoke URL:'));
      console.log(chalk.white('  '), chalk.yellow(confirmResponse.invoke_url));
      console.log(chalk.cyan('\nTry it:'));
      console.log(chalk.white('  curl'), chalk.cyan(confirmResponse.invoke_url));
      console.log(chalk.white('  orcapt lambda invoke'), chalk.cyan(functionName));
    }

    if (confirmResponse.sqs_queue_url) {
      console.log(chalk.cyan('\nSQS Queue (for async processing):'));
      console.log(chalk.white('  '), chalk.yellow(confirmResponse.sqs_queue_url));
      console.log(chalk.gray('  Note: SQS_QUEUE_URL is automatically set as an env variable'));
    }

    console.log(chalk.cyan('\n============================================================\n'));

  } catch (error) {
    console.log(chalk.red('\n✗ Deployment failed'));
    handleError(error, 'Lambda deployment');
    process.exit(1);
  }
}

/**
 * Lambda List Command
 */
async function lambdaList() {
  console.log(chalk.cyan('\n============================================================'));
  console.log(chalk.cyan('📋 Listing Lambda Functions'));
  console.log(chalk.cyan('============================================================\n'));

  const credentials = requireAuth();
  console.log(chalk.white('Workspace:'), chalk.yellow(credentials.workspace));

  const spinner = ora('Fetching functions...').start();

  try {
    // Call backend API to get list of functions
    const response = await makeApiRequest('GET', API_ENDPOINTS.LAMBDA_LIST, credentials);

    spinner.succeed(chalk.green('Functions retrieved'));

    console.log(chalk.cyan('\n============================================================'));
    
    if (response.count === 0) {
      console.log(chalk.yellow('No Lambda functions found'));
      console.log(chalk.cyan('\nCreate one with:'), chalk.white('orcapt lambda deploy <function-name> --image <docker-image>'));
    } else {
      console.log(chalk.green(`✓ Found ${response.count} function${response.count > 1 ? 's' : ''}`));
      console.log(chalk.cyan('============================================================\n'));
      
      response.functions.forEach((func, index) => {
        console.log(chalk.white(`  ${index + 1}. ${func.function_name}`));
        console.log(chalk.gray(`     Image:   ${func.image_uri || 'N/A'}`));
        console.log(chalk.gray(`     Status:  ${func.status}`));
        console.log(chalk.gray(`     Memory:  ${func.memory_mb} MB`));
        console.log(chalk.gray(`     Timeout: ${func.timeout_seconds}s`));
        if (func.invoke_url) {
          console.log(chalk.gray(`     URL:     ${func.invoke_url}`));
        }
        if (func.sqs_queue_url) {
          console.log(chalk.gray(`     SQS:     ${func.sqs_queue_url}`));
        }
        if (func.deployed_at) {
          console.log(chalk.gray(`     Deployed: ${new Date(func.deployed_at).toLocaleString()}`));
        }
        console.log();
      });
    }
    
    console.log(chalk.cyan('============================================================\n'));

  } catch (error) {
    spinner.fail(chalk.red('Failed to list functions'));
    handleError(error, 'Lambda listing');
    process.exit(1);
  }
}

/**
 * Lambda Invoke Command
 */
async function lambdaInvoke(functionName, options = {}) {
  console.log(chalk.cyan('\n============================================================'));
  console.log(chalk.cyan('▶️  Invoking Lambda Function'));
  console.log(chalk.cyan('============================================================\n'));

  const credentials = requireAuth();

  console.log(chalk.white('Function: '), chalk.yellow(functionName));
  
  // Parse payload if provided
  let payload = {};
  if (options.payload) {
    try {
      payload = JSON.parse(options.payload);
      console.log(chalk.white('Payload:  '), chalk.yellow(JSON.stringify(payload)));
    } catch (e) {
      console.log(chalk.red('\n✗ Invalid JSON payload'));
      console.log(chalk.yellow('Please provide valid JSON:'), chalk.white('--payload \'{"key": "value"}\'\n'));
      process.exit(1);
    }
  }
  
  // Add path (default to 'health' if not provided)
  const path = options.path || 'health';
  console.log(chalk.white('Path:     '), chalk.yellow(path));

  const spinner = ora('Invoking function...').start();

  try {
    // Call backend API to invoke Lambda function
    const startTime = Date.now();
    const endpoint = API_ENDPOINTS.LAMBDA_INVOKE.replace('{functionName}', functionName);
    const requestBody = { 
      payload,
      path: options.path || 'health' // Default path
    };
    
    const response = await makeApiRequest(
      'POST',
      endpoint,
      credentials,
      requestBody
    );

    const duration = Date.now() - startTime;
    
    spinner.succeed(chalk.green('Function invoked successfully'));

    console.log(chalk.cyan('\n============================================================'));
    console.log(chalk.green('✓ Invocation Result'));
    console.log(chalk.cyan('============================================================\n'));

    console.log(chalk.white('Status:    '), chalk.green(response.statusCode || 200));
    console.log(chalk.white('Duration:  '), chalk.yellow(`${duration}ms`));
    
    if (response.executedVersion) {
      console.log(chalk.white('Version:   '), chalk.yellow(response.executedVersion));
    }

    console.log(chalk.cyan('\nResponse:'));
    
    // Parse and format the response nicely
    const lambdaResponse = response.response || response;
    
    // If response has statusCode and body (API Gateway format)
    if (lambdaResponse.statusCode && lambdaResponse.body) {
      console.log(chalk.white('Status Code: '), chalk.green(lambdaResponse.statusCode));
      
      // Try to parse body as JSON
      let bodyContent;
      try {
        bodyContent = JSON.parse(lambdaResponse.body);
        console.log(chalk.white('\nBody:'));
        console.log(chalk.green(JSON.stringify(bodyContent, null, 2)));
      } catch (e) {
        // If not JSON, show as string
        console.log(chalk.white('\nBody:'));
        console.log(chalk.green(lambdaResponse.body));
      }
      
      // Show headers if available
      if (lambdaResponse.headers && Object.keys(lambdaResponse.headers).length > 0) {
        console.log(chalk.white('\nHeaders:'));
        Object.entries(lambdaResponse.headers).forEach(([key, value]) => {
          console.log(chalk.gray(`  ${key}: `), chalk.yellow(value));
        });
      }
    } else {
      // Regular response format
      console.log(chalk.green(JSON.stringify(lambdaResponse, null, 2)));
    }

    console.log(chalk.cyan('\n============================================================\n'));

  } catch (error) {
    spinner.fail(chalk.red('Invocation failed'));
    handleError(error, 'Lambda invocation');
    process.exit(1);
  }
}

/**
 * Lambda Logs Command
 */
async function lambdaLogs(functionName, options = {}) {
  console.log(chalk.cyan('\n============================================================'));
  console.log(chalk.cyan('📜 Lambda Function Logs'));
  console.log(chalk.cyan('============================================================\n'));

  const credentials = requireAuth();

  console.log(chalk.white('Function: '), chalk.yellow(functionName));
  
  if (options.since) {
    console.log(chalk.white('Since:    '), chalk.yellow(options.since));
  }
  
  if (options.tail) {
    console.log(chalk.white('Mode:     '), chalk.yellow('Live streaming'));
  }

  const spinner = ora('Fetching logs...').start();
  const endpoint = API_ENDPOINTS.LAMBDA_LOGS.replace('{functionName}', functionName);
  
  // Build query parameters for pagination
  const queryParams = {};
  if (options.page) {
    queryParams.page = parseInt(options.page) || 1;
  }
  if (options.perPage) {
    queryParams.per_page = Math.min(parseInt(options.perPage) || 100, 1000);
  }
  
  const queryString = new URLSearchParams(queryParams).toString();
  const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;
  
  try {
    // Call backend API to get logs
    const response = await makeApiRequest(
      'GET',
     fullEndpoint,
      credentials
    );

    spinner.succeed(chalk.green('Logs retrieved'));

    console.log(chalk.cyan('\n============================================================'));
    
    // Show sync statistics
    if (response.synced_from_cloudwatch !== undefined || response.skipped_duplicates !== undefined) {
      console.log(chalk.cyan('📊 Sync Statistics:'));
      if (response.total_cloudwatch_logs !== undefined) {
        console.log(chalk.white('  CloudWatch logs: '), chalk.yellow(response.total_cloudwatch_logs));
      }
      if (response.synced_from_cloudwatch !== undefined) {
        console.log(chalk.white('  Newly synced:   '), chalk.green(response.synced_from_cloudwatch));
      }
      if (response.skipped_duplicates !== undefined) {
        console.log(chalk.white('  Skipped (dup):  '), chalk.gray(response.skipped_duplicates));
      }
      console.log();
    }
    
    if (!response.logs || response.logs.length === 0) {
      console.log(chalk.yellow('No logs found in database'));
      console.log(chalk.cyan('\nTry invoking the function first:'));
      console.log(chalk.white('  orcapt lambda invoke'), chalk.cyan(functionName));
    } else {
      // Show pagination info
      if (response.pagination) {
        const pagination = response.pagination;
        console.log(chalk.cyan('📄 Pagination:'));
        console.log(chalk.white('  Page:         '), chalk.yellow(`${pagination.current_page} / ${pagination.total_pages}`));
        console.log(chalk.white('  Per page:     '), chalk.yellow(pagination.per_page));
        console.log(chalk.white('  Total logs:   '), chalk.yellow(pagination.total));
        console.log();
      }
      
      console.log(chalk.green(`✓ Showing ${response.logs.length} log entries (page ${response.pagination?.current_page || 1})`));
      console.log(chalk.cyan('============================================================\n'));
      
      response.logs.forEach(log => {
        const timestamp = new Date(log.timestamp).toLocaleString();
        const level = log.level.toUpperCase();
        
        let levelColor = chalk.white;
        if (level === 'ERROR') levelColor = chalk.red;
        else if (level === 'WARNING') levelColor = chalk.yellow;
        else if (level === 'INFO') levelColor = chalk.blue;
        
        console.log(
          chalk.gray(`[${timestamp}]`),
          levelColor(`${level}:`),
          chalk.white(log.message)
        );
      });
      
      // Show pagination navigation hints
      if (response.pagination) {
        const pagination = response.pagination;
        console.log(chalk.cyan('\n============================================================'));
        if (pagination.has_prev_page) {
          console.log(chalk.white('  Previous page: '), chalk.cyan(`orcapt lambda logs ${functionName} --page ${pagination.current_page - 1}`));
        }
        if (pagination.has_next_page) {
          console.log(chalk.white('  Next page:     '), chalk.cyan(`orcapt lambda logs ${functionName} --page ${pagination.current_page + 1}`));
        }
        if (!pagination.has_prev_page && !pagination.has_next_page) {
          console.log(chalk.gray('  (No more pages)'));
        }
      }
    }
    
    console.log(chalk.cyan('\n============================================================'));
    
    if (options.tail) {
      console.log(chalk.yellow('\n⚠ Live streaming not yet supported'));
      console.log(chalk.cyan('Showing latest logs only\n'));
    } else {
      console.log();
    }

  } catch (error) {
    spinner.fail(chalk.red('Failed to fetch logs'));
    handleError(error, 'Lambda logs');
    process.exit(1);
  }
}

/**
 * Lambda Remove Command
 */
async function lambdaRemove(functionName) {
  console.log(chalk.cyan('\n============================================================'));
  console.log(chalk.cyan('🗑️  Removing Lambda Function'));
  console.log(chalk.cyan('============================================================\n'));

  const credentials = requireAuth();

  console.log(chalk.white('Function:  '), chalk.yellow(functionName));
  console.log(chalk.white('Workspace: '), chalk.yellow(credentials.workspace));
  
  // Confirmation prompt
  console.log(chalk.red('\n⚠️  WARNING: This will permanently delete the function!'));
  console.log(chalk.yellow('The Lambda function and all its configurations will be removed.'));
  console.log(chalk.yellow('ECR repository will be kept for potential rollback.\n'));

  const spinner = ora('Removing function...').start();

  try {
    // Call backend API to delete Lambda function
    const response = await makeApiRequest(
      'DELETE',
      `${API_ENDPOINTS.LAMBDA_DELETE}/${functionName}`,
      credentials
    );

    spinner.succeed(chalk.green('Function removed successfully'));

    console.log(chalk.cyan('\n============================================================'));
    console.log(chalk.green('✓ Function Removed'));
    console.log(chalk.cyan('============================================================'));
    console.log(chalk.white('Function:  '), chalk.yellow(functionName));
    console.log(chalk.white('Workspace: '), chalk.yellow(credentials.workspace));
    console.log(chalk.cyan('============================================================\n'));

    console.log(chalk.gray('Note: ECR repository has been kept for potential rollback.'));
    console.log(chalk.gray('You can manually clean it up if needed.\n'));

  } catch (error) {
    spinner.fail(chalk.red('Failed to remove function'));
    handleError(error, 'Lambda removal');
    process.exit(1);
  }
}

/**
 * Lambda Info Command - Get function details
 */
async function lambdaInfo(functionName) {
  console.log(chalk.cyan('\n============================================================'));
  console.log(chalk.cyan('🔍 Lambda Function Details'));
  console.log(chalk.cyan('============================================================\n'));

  const credentials = requireAuth();

  const spinner = ora('Fetching function details...').start();

  try {
    // Call backend API to get function details
    const response = await makeApiRequest(
      'GET',
      `${API_ENDPOINTS.LAMBDA_INFO}/${functionName}`,
      credentials
    );

    spinner.succeed(chalk.green('Function details retrieved'));

    console.log(chalk.cyan('\n============================================================'));
    console.log(chalk.green('✓ Function Information'));
    console.log(chalk.cyan('============================================================\n'));

    console.log(chalk.white('Name:         '), chalk.yellow(response.function_name));
    console.log(chalk.white('Status:       '), 
      response.status === 'active' ? chalk.green(response.status) : chalk.yellow(response.status)
    );
    console.log(chalk.white('Image:        '), chalk.yellow(response.image_uri || 'N/A'));
    console.log(chalk.white('Region:       '), chalk.yellow(response.aws_region || 'us-east-1'));
    console.log(chalk.white('Memory:       '), chalk.yellow(`${response.memory_mb} MB`));
    console.log(chalk.white('Timeout:      '), chalk.yellow(`${response.timeout_seconds}s`));
    
    if (response.function_arn) {
      console.log(chalk.white('Function ARN: '), chalk.gray(response.function_arn));
    }
    
    if (response.created_at) {
      console.log(chalk.white('Created:      '), chalk.yellow(new Date(response.created_at).toLocaleString()));
    }
    
    if (response.deployed_at) {
      console.log(chalk.white('Last Deploy:  '), chalk.yellow(new Date(response.deployed_at).toLocaleString()));
    }

    // Environment Variables
    if (response.environment_vars && Object.keys(response.environment_vars).length > 0) {
      console.log(chalk.cyan('\nEnvironment Variables:'));
      Object.entries(response.environment_vars).forEach(([key, value]) => {
        // Hide sensitive values
        const displayValue = key.toLowerCase().includes('password') || 
                            key.toLowerCase().includes('secret') || 
                            key.toLowerCase().includes('key') 
                            ? '***hidden***' : value;
        console.log(chalk.white(`  ${key}:`.padEnd(20)), chalk.yellow(displayValue));
      });
    }

    // Invoke URL
    if (response.invoke_url) {
      console.log(chalk.cyan('\nInvoke URL:'));
      console.log(chalk.white('  '), chalk.yellow(response.invoke_url));
    }

    // Metrics (if available)
    if (response.metrics) {
      console.log(chalk.cyan('\nMetrics (Last 24h):'));
      console.log(chalk.white('  Invocations: '), chalk.yellow(response.metrics.invocations || 0));
      console.log(chalk.white('  Errors:      '), chalk.yellow(response.metrics.errors || 0));
      if (response.metrics.avg_duration) {
        console.log(chalk.white('  Avg Duration:'), chalk.yellow(`${response.metrics.avg_duration}ms`));
      }
      if (response.metrics.total_cost) {
        console.log(chalk.white('  Total Cost:  '), chalk.yellow(`$${response.metrics.total_cost}`));
      }
    }

    console.log(chalk.cyan('\n============================================================'));
    console.log(chalk.gray('\nCommands:'));
    console.log(chalk.white('  Invoke:  '), chalk.cyan(`orcapt lambda invoke ${functionName}`));
    console.log(chalk.white('  Logs:    '), chalk.cyan(`orcapt lambda logs ${functionName}`));
    console.log(chalk.white('  Update:  '), chalk.cyan(`orcapt lambda update ${functionName} --image new-image:tag`));
    console.log(chalk.white('  Remove:  '), chalk.cyan(`orcapt lambda remove ${functionName}`));
    console.log();

  } catch (error) {
    spinner.fail(chalk.red('Failed to fetch function details'));
    handleError(error, 'Lambda info');
    process.exit(1);
  }
}

module.exports = {
  lambdaDeploy,
  lambdaList,
  lambdaInvoke,
  lambdaLogs,
  lambdaRemove,
  lambdaInfo
};

