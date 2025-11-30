/**
 * Docker Helper Utilities
 * Helper functions for Docker operations (check, tag, push)
 */

const { spawn, exec } = require('child_process');
const ora = require('ora');
const chalk = require('chalk');

/**
 * Check if Docker is installed and running
 */
async function checkDockerInstalled() {
  return new Promise((resolve, reject) => {
    exec('docker --version', (error, stdout, stderr) => {
      if (error) {
        reject(new Error('Docker is not installed or not running'));
      } else {
        resolve(true);
      }
    });
  });
}

/**
 * Check if Docker image exists locally
 */
async function checkDockerImage(imageName) {
  return new Promise((resolve, reject) => {
    exec(`docker images -q ${imageName}`, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout.trim().length > 0);
      }
    });
  });
}

/**
 * Get Docker image size
 */
async function getImageSize(imageName) {
  return new Promise((resolve, reject) => {
    exec(`docker images ${imageName} --format "{{.Size}}"`, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

/**
 * Login to Docker registry (ECR or Docker Hub) with timeout and retry
 */
async function dockerLogin(registry, username, password, retries = 3) {
  const TIMEOUT_MS = 60000; // 60 seconds timeout
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await new Promise((resolve, reject) => {
        const loginProcess = spawn('sh', ['-c', `echo "${password}" | docker login -u ${username} --password-stdin ${registry}`]);
        
        let output = '';
        let errorOutput = '';
        let timeoutId;

        // Set timeout
        timeoutId = setTimeout(() => {
          loginProcess.kill();
          reject(new Error(`Docker login timed out after ${TIMEOUT_MS / 1000} seconds`));
        }, TIMEOUT_MS);

        loginProcess.stdout.on('data', (data) => {
          output += data.toString();
        });

        loginProcess.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        loginProcess.on('close', (code) => {
          clearTimeout(timeoutId);
          if (code === 0) {
            resolve(output);
          } else {
            reject(new Error(`Docker login failed: ${errorOutput}`));
          }
        });

        loginProcess.on('error', (error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
      });
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      // Wait before retry (exponential backoff)
      const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

/**
 * Tag Docker image for registry
 */
async function dockerTag(sourceImage, targetImage) {
  return new Promise((resolve, reject) => {
    exec(`docker tag ${sourceImage} ${targetImage}`, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Failed to tag image: ${stderr || error.message}`));
      } else {
        resolve(true);
      }
    });
  });
}

/**
 * Push Docker image to registry with progress tracking
 */
async function dockerPush(imageName, onProgress) {
  return new Promise((resolve, reject) => {
    const pushProcess = spawn('docker', ['push', imageName], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let layers = {};
    let totalLayers = 0;
    let completedLayers = 0;
    let lastOutput = Date.now();
    let hasError = false;
    let errorMessage = '';
    let initialScanDone = false;

    // Timeout after 10 minutes of no output
    const timeoutCheck = setInterval(() => {
      const timeSinceLastOutput = Date.now() - lastOutput;
      if (timeSinceLastOutput > 600000) { // 10 minutes
        clearInterval(timeoutCheck);
        pushProcess.kill();
        reject(new Error('Push timed out - no output for 10 minutes'));
      }
    }, 5000);

    pushProcess.stdout.on('data', (data) => {
      lastOutput = Date.now();
      const output = data.toString();
      const lines = output.split('\n');
      
      lines.forEach(line => {
        // Detect all layers first (from "Preparing" or "Waiting" status)
        const preparingMatch = line.match(/([a-f0-9]{12}):\s+(Preparing|Waiting|Layer already exists)/);
        if (preparingMatch && !initialScanDone) {
          const layerId = preparingMatch[1];
          if (!layers[layerId]) {
            layers[layerId] = { total: 0, current: 0, completed: false, status: 'preparing' };
            totalLayers++;
          }
        }
        
        // Layer pushing with progress: "abc123: Pushing [==>  ] 10MB/50MB"
        const pushingMatch = line.match(/([a-f0-9]{12}):\s+Pushing\s+\[([=>\s]+)\]\s+([\d.]+)([KMG]B)\/([\d.]+)([KMG]B)/);
        if (pushingMatch) {
          const layerId = pushingMatch[1];
          const currentSize = parseFloat(pushingMatch[3]);
          const currentUnit = pushingMatch[4];
          const totalSize = parseFloat(pushingMatch[5]);
          const totalUnit = pushingMatch[6];
          
          // Convert to bytes for accurate calculation
          const currentBytes = convertToBytes(currentSize, currentUnit);
          const totalBytes = convertToBytes(totalSize, totalUnit);
          
          if (!layers[layerId]) {
            layers[layerId] = { total: totalBytes, current: currentBytes, completed: false, status: 'pushing' };
            totalLayers++;
          } else {
            layers[layerId].total = totalBytes;
            layers[layerId].current = currentBytes;
            layers[layerId].status = 'pushing';
          }
        }
        
        // Layer completed: "abc123: Pushed"
        const pushedMatch = line.match(/([a-f0-9]{12}):\s+(Pushed|Layer already exists)/);
        if (pushedMatch) {
          const layerId = pushedMatch[1];
          const isAlreadyExists = pushedMatch[2] === 'Layer already exists';
          
          if (!layers[layerId]) {
            layers[layerId] = { total: 0, current: 0, completed: true, status: 'complete' };
            totalLayers++;
            completedLayers++;
          } else if (!layers[layerId].completed) {
            layers[layerId].completed = true;
            layers[layerId].status = 'complete';
            // If it was pushing, mark as fully uploaded
            if (layers[layerId].total > 0) {
              layers[layerId].current = layers[layerId].total;
            }
            completedLayers++;
          }
        }
        
        // Calculate overall progress
        if (totalLayers > 0 && onProgress) {
          let totalBytes = 0;
          let uploadedBytes = 0;
          let layersWithSize = 0;
          
          Object.values(layers).forEach(layer => {
            if (layer.total > 0) {
              totalBytes += layer.total;
              uploadedBytes += layer.current || 0;
              layersWithSize++;
            }
          });
          
          let overallPercent = 0;
          
          if (totalBytes > 0) {
            // محاسبه بر اساس bytes واقعی
            overallPercent = Math.round((uploadedBytes / totalBytes) * 100);
          } else if (totalLayers > 0) {
            // اگر هنوز size نداریم، بر اساس تعداد layer های complete شده
            overallPercent = Math.round((completedLayers / totalLayers) * 100);
          }
          
          onProgress(overallPercent, completedLayers, totalLayers);
        }
      });
    });

    pushProcess.stderr.on('data', (data) => {
      lastOutput = Date.now();
      const output = data.toString();
      
      // Check for errors
      if (output.toLowerCase().includes('error') || 
          output.toLowerCase().includes('denied') ||
          output.toLowerCase().includes('unauthorized')) {
        hasError = true;
        errorMessage += output;
      }
    });

    pushProcess.on('close', (code) => {
      clearInterval(timeoutCheck);
      
      if (code === 0) {
        // آخرین بار progress را 100% کن
        if (onProgress && totalLayers > 0) {
          onProgress(100, totalLayers, totalLayers);
        }
        resolve(true);
      } else {
        const error = hasError && errorMessage 
          ? `Push failed: ${errorMessage}` 
          : 'Failed to push image to registry';
        reject(new Error(error));
      }
    });

    pushProcess.on('error', (error) => {
      clearInterval(timeoutCheck);
      reject(error);
    });
  });
}

/**
 * Convert size with unit to bytes
 */
function convertToBytes(size, unit) {
  const units = {
    'B': 1,
    'KB': 1024,
    'MB': 1024 * 1024,
    'GB': 1024 * 1024 * 1024
  };
  return size * (units[unit] || 1);
}

/**
 * Complete flow: Login, Tag, and Push image to ECR
 */
async function pushImageToECR(localImage, ecrUrl, username, password, repositoryUri) {
  const spinner = ora('Preparing to push image...').start();

  try {
    // Step 1: Login to ECR (with retry logic)
    spinner.text = 'Logging in to ECR (may take up to 60s)...';
    try {
      await dockerLogin(ecrUrl, username, password, 3); // 3 retries
      spinner.succeed(chalk.green('✓ Logged in to ECR'));
    } catch (loginError) {
      spinner.fail(chalk.red('✗ Failed to login to ECR'));
      console.log(chalk.yellow('\n⚠️  Troubleshooting tips:'));
      console.log(chalk.white('  1. Check your internet connection'));
      console.log(chalk.white('  2. Verify Docker is running: docker info'));
      console.log(chalk.white('  3. Try restarting Docker'));
      console.log(chalk.white('  4. Check if you can reach ECR:'));
      console.log(chalk.cyan(`     curl -I ${ecrUrl}/v2/`));
      console.log();
      throw loginError;
    }

    // Step 2: Tag image for ECR
    spinner.start('Tagging image for ECR...');
    const remoteTag = `${repositoryUri}:latest`;
    await dockerTag(localImage, remoteTag);
    spinner.succeed(chalk.green(`✓ Tagged: ${localImage} → ${remoteTag}`));

    // Step 3: Push image to ECR with progress
    spinner.start('Pushing image to ECR...');
    
    let lastPercent = 0;
    await dockerPush(remoteTag, (percent, completed, total) => {
      if (percent > lastPercent || percent === 100) {
        lastPercent = percent;
        
        // Create progress bar
        const barLength = 30;
        const filledLength = Math.floor((percent / 100) * barLength);
        const progressBar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
        
        // Update spinner text with progress
        const layerInfo = total > 0 ? ` (${completed}/${total} layers)` : '';
        spinner.text = `Pushing image to ECR... [${progressBar}] ${percent}%${layerInfo}`;
      }
    });

    spinner.succeed(chalk.green('✓ Image pushed to ECR successfully!'));
    return remoteTag;

  } catch (error) {
    spinner.fail(chalk.red('✗ Failed to push image'));
    throw error;
  }
}

module.exports = {
  checkDockerInstalled,
  checkDockerImage,
  getImageSize,
  dockerLogin,
  dockerTag,
  dockerPush,
  pushImageToECR
};

