/**
 * Orca CLI Configuration
 * Centralized configuration for all API endpoints and URLs
 */

// Main Orca Deploy API
// Resolution order:
// 1) ORCA_API_URL (explicit full URL override)
// 2) ORCA_API_<ENV>_URL (env-specific URL override)
// 3) Built-in defaults for ORCA_ENV=local|stage|prod
const DEFAULT_API_URLS = {
  local: 'http://localhost:8000',
  stage: 'https://deploy-stage-api.orcapt.com',
  prod: 'https://deploy-api.orcapt.com'
};

const ORCA_ENV = (process.env.ORCA_ENV || 'stage').toLowerCase();
const resolvedEnv = Object.prototype.hasOwnProperty.call(DEFAULT_API_URLS, ORCA_ENV)
  ? ORCA_ENV
  : 'stage';
const envSpecificOverride = process.env[`ORCA_API_${resolvedEnv.toUpperCase()}_URL`];
const API_BASE_URL = process.env.ORCA_API_URL || envSpecificOverride || DEFAULT_API_URLS[resolvedEnv];

// API Endpoints
const API_ENDPOINTS = {
  // Authentication
  AUTH: '/api/v1/cli/auth',
  AGENTS_LIST: '/api/v1/cli/agents',
  AGENT_INFO: '/api/v1/cli/agents/{identifier}',
  
  // Database
  DB_CREATE: '/api/v1/db/create',
  DB_LIST: '/api/v1/db/list',
  DB_DELETE: '/api/v1/db/delete',
  
  // Storage
  STORAGE_BUCKET_CREATE: '/api/v1/storage/bucket/create',
  STORAGE_BUCKET_LIST: '/api/v1/storage/bucket/list',
  STORAGE_BUCKET_INFO: '/api/v1/storage/bucket/{bucketName}',
  STORAGE_BUCKET_DELETE: '/api/v1/storage/bucket/{bucketName}',
  STORAGE_UPLOAD: '/api/v1/storage/{bucketName}/upload',
  STORAGE_DOWNLOAD: '/api/v1/storage/{bucketName}/download/{fileKey}',
  STORAGE_FILE_LIST: '/api/v1/storage/{bucketName}/files',
  STORAGE_FILE_DELETE: '/api/v1/storage/{bucketName}/file/{fileKey}',
  STORAGE_PERMISSION_ADD: '/api/v1/storage/{bucketName}/permission/add',
  STORAGE_PERMISSION_LIST: '/api/v1/storage/{bucketName}/permissions',
  STORAGE_PERMISSION_DELETE: '/api/v1/storage/permission/{permissionId}',
  
  // Lambda
  LAMBDA_DEPLOY: '/api/v1/cli/ship/deploy',
  LAMBDA_LIST: '/api/v1/cli/lambda/list',
  LAMBDA_INFO: '/api/v1/cli/lambda/{functionName}',
  LAMBDA_DELETE: '/api/v1/cli/lambda/{functionName}',
  LAMBDA_INVOKE: '/api/v1/cli/lambda/{functionName}/invoke',
  LAMBDA_LOGS: '/api/v1/cli/lambda/{functionName}/logs',
  LAMBDA_START: '/api/v1/cli/lambda',
  LAMBDA_STOP: '/api/v1/cli/lambda',

  // EC2 ship
  EC2_PREPARE_PUSH: '/api/v1/cli/ship/ec2/prepare-push',
  EC2_DEPLOY: '/api/v1/cli/ship/ec2/deploy',
  EC2_STOP: '/api/v1/cli/ship/ec2/{deploymentId}/stop',
  EC2_STATUS: '/api/v1/cli/ship/ec2/{deploymentId}/status',
  EC2_LOGS: '/api/v1/cli/ship/ec2/{deploymentId}/logs'
};

// GitHub Repository URLs
const GITHUB_REPOS = {
  PYTHON_STARTER: 'https://github.com/Orcapt/orca-starter-kit-python-v1',
  NODE_STARTER: 'https://github.com/Orcapt/orca-starter-kit-node-v1'
};

// Documentation URLs
const DOCS_URLS = {
  PYTHON: 'https://raw.githubusercontent.com/Orcapt/orca-pip/refs/heads/orca/docs/guides/DEVELOPER_GUIDE.md',
  NODEJS: 'https://raw.githubusercontent.com/Orcapt/orca-npm/refs/heads/main/QUICKSTART.md'
};

module.exports = {
  ORCA_ENV: resolvedEnv,
  API_BASE_URL,
  API_ENDPOINTS,
  GITHUB_REPOS,
  DOCS_URLS
};

