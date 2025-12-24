/**
 * Orca CLI Configuration
 * Centralized configuration for all API endpoints and URLs
 */

// Main Orca Deploy API
// Can be overridden with ORCA_API_URL environment variable
const API_BASE_URL = process.env.ORCA_API_URL  ||'https://deploy-api.orcapt.com';

// API Endpoints
const API_ENDPOINTS = {
  // Authentication
  AUTH: '/api/v1/auth',
  
  // Database
  DB_CREATE: '/api/v1/db/create',
  DB_LIST: '/api/v1/db/list',
  DB_DELETE: '/api/v1/db/delete-schema',
  
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
  LAMBDA_DEPLOY: '/api/v1/lambda/deploy',
  LAMBDA_LIST: '/api/v1/lambda/list',
  LAMBDA_INFO: '/api/v1/lambda/{functionName}',
  LAMBDA_DELETE: '/api/v1/lambda/{functionName}',
  LAMBDA_INVOKE: '/api/v1/lambda/{functionName}/invoke',
  LAMBDA_LOGS: '/api/v1/lambda/{functionName}/logs',
  LAMBDA_START: '/api/v1/lambda',
  LAMBDA_STOP: '/api/v1/lambda'
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
  API_BASE_URL,
  API_ENDPOINTS,
  GITHUB_REPOS,
  DOCS_URLS
};

