/**
 * Unified Error Handler for Orca CLI
 * Handles errors from different API services and formats them for CLI display
 */

const chalk = require('chalk');

/**
 * Extract error message from API response
 * Supports multiple response formats:
 * - databaseasservice: { success: false, error: "message" }
 * - gptclone-api/platform-api: { result: null, message: "message" }
 * - Generic: { detail: "message" } or { message: "message" }
 */
function extractErrorMessage(error) {
  if (!error.response) {
    return error.message || 'Unknown error occurred';
  }

  const response = error.response;

  // databaseasservice format: { success: false, error: "message" }
  if (response.error) {
    return response.error;
  }

  // gptclone-api/platform-api format: { result: null, message: "message" }
  if (response.message) {
    return response.message;
  }

  // Generic format: { detail: "message" }
  if (response.detail) {
    return response.detail;
  }

  // Laravel validation errors: { errors: { field: ["message"] } }
  if (response.errors && typeof response.errors === 'object') {
    const errorMessages = [];
    for (const [field, messages] of Object.entries(response.errors)) {
      if (Array.isArray(messages)) {
        errorMessages.push(...messages);
      } else {
        errorMessages.push(messages);
      }
    }
    if (errorMessages.length > 0) {
      return errorMessages.join(', ');
    }
  }

  // Fallback: try to stringify the response
  if (typeof response === 'string') {
    return response;
  }

  return 'Unknown error occurred';
}

/**
 * Get user-friendly error message based on status code
 */
function getStatusMessage(statusCode) {
  const messages = {
    400: 'Bad Request - Please check your input parameters',
    401: 'Authentication failed - Your session may have expired',
    403: 'Forbidden - You don\'t have permission to perform this action',
    404: 'Resource not found',
    409: 'Conflict - Resource already exists',
    422: 'Validation error - Please check your input',
    500: 'Internal server error - Please try again later',
    502: 'Bad Gateway - Service temporarily unavailable',
    503: 'Service unavailable - Please try again later',
    504: 'Gateway timeout - Request took too long',
  };

  return messages[statusCode] || `HTTP ${statusCode} error`;
}

/**
 * Handle and display error to CLI
 */
function handleError(error, context = 'Operation') {
  const statusCode = error.statusCode || error.status || (error.response && error.response.statusCode);
  const errorMessage = extractErrorMessage(error);

  // Network/connection errors
  if (error.code === 'ECONNREFUSED') {
    console.log(chalk.red(`\n✗ Connection refused`));
    console.log(chalk.yellow('The API server is not reachable. Please check:'));
    console.log(chalk.white('  1. Is the backend service running?'));
    console.log(chalk.white('  2. Is the API URL correct?'));
    console.log(chalk.white('  3. Check your network connection\n'));
    return;
  }

  if (error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    console.log(chalk.red(`\n✗ Network error: ${error.message}`));
    console.log(chalk.yellow('Please check your network connection and API URL\n'));
    return;
  }

  // HTTP status code errors
  if (statusCode) {
    const statusMessage = getStatusMessage(statusCode);
    
    console.log(chalk.red(`\n✗ ${context} failed`));
    console.log(chalk.red(`  Status: ${statusCode} - ${statusMessage}`));
    
    if (errorMessage && errorMessage !== 'Unknown error occurred') {
      console.log(chalk.yellow(`  Error: ${errorMessage}`));
    }

    // Specific handling for common status codes
    if (statusCode === 401) {
      console.log(chalk.cyan('\nPlease run:'), chalk.white('orcapt login'), chalk.cyan('to authenticate\n'));
    } else if (statusCode === 404) {
      console.log(chalk.yellow('\nThe requested resource was not found or doesn\'t belong to your workspace\n'));
    } else if (statusCode === 422) {
      console.log(chalk.yellow('\nPlease check your input parameters and try again\n'));
    } else if (statusCode >= 500) {
      console.log(chalk.yellow('\nThis appears to be a server-side error. Please try again later.\n'));
      console.log(chalk.gray('If the problem persists, contact support.\n'));
    } else {
      console.log('');
    }
    return;
  }

  // Generic error
  console.log(chalk.red(`\n✗ ${context} failed`));
  console.log(chalk.red(`  ${errorMessage}\n`));
}

/**
 * Format error for programmatic use (returns error object)
 */
function formatError(error) {
  return {
    statusCode: error.statusCode || error.status || (error.response && error.response.statusCode),
    message: extractErrorMessage(error),
    code: error.code,
    response: error.response,
  };
}

module.exports = {
  handleError,
  formatError,
  extractErrorMessage,
  getStatusMessage,
};

