/**
 * orcapt Agents Commands
 * List agents available in the current tenant/workspace.
 */

const chalk = require('chalk');
const ora = require('ora');
const https = require('https');
const http = require('http');
const { getCredentials } = require('./login');
const { API_BASE_URL, API_ENDPOINTS } = require('../config');
const { handleError } = require('../utils/errorHandler');

function formatAgentType(type) {
  if (type === 'agentic_system') return 'Connected Agentic AI';
  if (type === 'orca_agent') return 'Orca Agents';
  return type || 'n/a';
}

function makeApiRequest(method, endpoint, credentials, query = '') {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint + query, API_BASE_URL);
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
        'Accept': 'application/json'
      }
    };

    const req = httpModule.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
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
    req.end();
  });
}

async function listAgents(options = {}) {
  console.log(chalk.cyan('\n============================================================'));
  console.log(chalk.cyan('🤖 Listing Agents'));
  console.log(chalk.cyan('============================================================\n'));

  const credentials = getCredentials();
  if (!credentials) {
    console.log(chalk.red('✗ Not authenticated'));
    console.log(chalk.cyan('Please run:'), chalk.yellow('orca login'), chalk.cyan('first (fallback: orcapt login)\n'));
    process.exit(1);
  }

  const params = new URLSearchParams();
  if (options.search) params.set('search', options.search);
  if (options.perPage) params.set('per_page', String(options.perPage));
  const query = params.toString() ? `?${params.toString()}` : '';

  const spinner = ora('Fetching agents...').start();
  try {
    const response = await makeApiRequest('GET', API_ENDPOINTS.AGENTS_LIST, credentials, query);
    spinner.succeed(chalk.green('Agents retrieved'));

    const payload = response.result || {};
    const agents = Array.isArray(payload.data) ? payload.data : [];

    console.log(chalk.white('Workspace:'), chalk.yellow(credentials.workspace));
    console.log(chalk.white('Tenant:   '), chalk.yellow(credentials.tenant || credentials.workspace));
    console.log(chalk.white('Count:    '), chalk.yellow(String(payload.total ?? agents.length)));
    console.log();

    if (!agents.length) {
      console.log(chalk.yellow('No agents found.\n'));
      return;
    }

    agents.forEach((agent, idx) => {
      console.log(
        `${chalk.cyan(`${idx + 1}.`)} ${chalk.white(agent.name)} ` +
        `${chalk.gray(`(${agent.slug})`)} - ${chalk.yellow(formatAgentType(agent.type))}`
      );
    });
    console.log();
  } catch (error) {
    spinner.fail(chalk.red('Failed to fetch agents'));
    handleError(error, 'Agent listing');
    process.exit(1);
  }
}

async function showAgent(identifier) {
  console.log(chalk.cyan('\n============================================================'));
  console.log(chalk.cyan('🔎 Agent Details'));
  console.log(chalk.cyan('============================================================\n'));

  const credentials = getCredentials();
  if (!credentials) {
    console.log(chalk.red('✗ Not authenticated'));
    console.log(chalk.cyan('Please run:'), chalk.yellow('orca login'), chalk.cyan('first (fallback: orcapt login)\n'));
    process.exit(1);
  }

  const endpoint = API_ENDPOINTS.AGENT_INFO.replace('{identifier}', encodeURIComponent(identifier));
  const spinner = ora('Fetching agent details...').start();
  try {
    const response = await makeApiRequest('GET', endpoint, credentials);
    spinner.succeed(chalk.green('Agent details retrieved'));

    const agent = response.result || {};
    const typeLabel = formatAgentType(agent.type);
    const isAgentic = agent.type === 'agentic_system' ? 'Yes' : 'No';

    console.log(chalk.white('Name:            '), chalk.yellow(agent.name || '-'));
    console.log(chalk.white('Slug:            '), chalk.yellow(agent.slug || '-'));
    console.log(chalk.white('Type:            '), chalk.yellow(typeLabel));
    console.log(chalk.white('Agentic:         '), chalk.yellow(isAgentic));
    console.log(chalk.white('Endpoint:        '), chalk.yellow(agent.endpoint || '-'));
    console.log(chalk.white('Description:     '), chalk.yellow(agent.description || '-'));
    console.log(chalk.white('Source:          '), chalk.yellow(agent.source || '-'));
    console.log(chalk.white('Docs URL:        '), chalk.yellow(agent.doc_url || '-'));
    console.log(chalk.white('Memory Active:   '), chalk.yellow(agent.memory_active ? 'Yes' : 'No'));
    console.log(chalk.white('Knowledge Active:'), chalk.yellow(agent.knowledge_active ? 'Yes' : 'No'));
    console.log();
  } catch (error) {
    spinner.fail(chalk.red('Failed to fetch agent details'));
    handleError(error, 'Agent details');
    process.exit(1);
  }
}

module.exports = {
  listAgents,
  showAgent
};
