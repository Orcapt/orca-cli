/**
 * orcapt Storage Commands
 * Manage S3-like storage buckets and files via orcapt Deploy API
 */

const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { getCredentials } = require('./login');
const { API_BASE_URL, API_ENDPOINTS } = require('../config');

/**
 * Make API request to orcapt Deploy API
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
        'x-mode': credentials.mode || 'dev',
        'Content-Type': 'application/json'
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
 * Upload file using multipart/form-data
 */
function uploadFileToApi(endpoint, credentials, filePath, bucketName, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint.replace('{bucketName}', bucketName), API_BASE_URL);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const fileStream = fs.createReadStream(filePath);
    const fileName = path.basename(filePath);
    const boundary = `----FormBoundary${Date.now()}`;
    
    const folderPath = options.folder || '';
    
    // Build multipart form data
    let formData = '';
    
    // Add folder_path field
    if (folderPath) {
      formData += `--${boundary}\r\n`;
      formData += `Content-Disposition: form-data; name="folder_path"\r\n\r\n`;
      formData += `${folderPath}\r\n`;
    }
    
    // Add visibility field
    if (options.visibility) {
      formData += `--${boundary}\r\n`;
      formData += `Content-Disposition: form-data; name="visibility"\r\n\r\n`;
      formData += `${options.visibility}\r\n`;
    }
    
    // Add generate_url field
    formData += `--${boundary}\r\n`;
    formData += `Content-Disposition: form-data; name="generate_url"\r\n\r\n`;
    formData += `true\r\n`;
    
    // Add file field header
    formData += `--${boundary}\r\n`;
    formData += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
    formData += `Content-Type: application/octet-stream\r\n\r\n`;

    const formDataBuffer = Buffer.from(formData, 'utf8');
    const endBoundary = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');

    const fileStats = fs.statSync(filePath);
    const contentLength = formDataBuffer.length + fileStats.size + endBoundary.length;

    const requestOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'x-workspace': credentials.workspace,
        'x-token': credentials.token,
        'x-mode': credentials.mode || 'dev',
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': contentLength
      }
    };

    const req = httpModule.request(requestOptions, (res) => {
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

    // Write form data header
    req.write(formDataBuffer);

    // Stream file
    fileStream.on('data', (chunk) => {
      req.write(chunk);
    });

    fileStream.on('end', () => {
      req.write(endBoundary);
      req.end();
    });

    fileStream.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
 * Bucket Create Command
 */
async function bucketCreate(bucketName, options = {}) {
  console.log(chalk.cyan('\n============================================================'));
  console.log(chalk.cyan('🪣 Creating Storage Bucket'));
  console.log(chalk.cyan('============================================================\n'));

  const credentials = requireAuth();
  
  console.log(chalk.white('Bucket:     '), chalk.yellow(bucketName));
  console.log(chalk.white('Workspace:  '), chalk.yellow(credentials.workspace));
  console.log(chalk.white('Visibility: '), chalk.yellow(options.public ? 'public' : 'private'));
  if (options.description) {
    console.log(chalk.white('Description:'), chalk.yellow(options.description));
  }

  const spinner = ora('Creating bucket...').start();

  try {
    const requestBody = {
      bucket_name: bucketName,
      visibility: options.public ? 'public' : 'private',
      versioning_enabled: options.versioning || false,
      encryption_enabled: options.encryption !== false,
      encryption_type: options.encryptionType || 'AES256'
    };

    if (options.description) {
      requestBody.description = options.description;
    }

    const response = await makeApiRequest(
      'POST',
      API_ENDPOINTS.STORAGE_BUCKET_CREATE,
      credentials,
      requestBody
    );

    spinner.succeed(chalk.green('✓ Bucket created successfully!'));
    
    console.log(chalk.cyan('\n📦 Bucket Details:'));
    console.log(chalk.white('  Name:       '), chalk.yellow(response.bucket.bucket_name));
    console.log(chalk.white('  AWS Bucket: '), chalk.gray(response.bucket.aws_bucket_name));
    console.log(chalk.white('  Region:     '), chalk.yellow(response.bucket.region));
    console.log(chalk.white('  Status:     '), chalk.green(response.bucket.status));
    console.log(chalk.white('  Visibility: '), chalk.yellow(response.bucket.visibility));
    console.log(chalk.white('  Encryption: '), chalk.yellow(response.bucket.encryption_enabled ? 'Enabled' : 'Disabled'));
    
    console.log(chalk.cyan('\n💡 Next Steps:'));
    console.log(chalk.white('  Upload file:  '), chalk.yellow(`orcapt storage upload ${bucketName} <file-path>`));
    console.log(chalk.white('  List files:   '), chalk.yellow(`orcapt storage files ${bucketName}`));
    console.log('');

  } catch (error) {
    spinner.fail(chalk.red('✗ Failed to create bucket'));
    
    if (error.response) {
      console.log(chalk.red(`\n✗ ${error.response.message || 'Unknown error'}`));
      if (error.statusCode === 409) {
        console.log(chalk.yellow('  Bucket name already exists for this workspace'));
      } else if (error.statusCode === 422) {
        console.log(chalk.yellow('  Invalid bucket name or parameters'));
      }
    } else {
      console.log(chalk.red(`\n✗ ${error.message}`));
    }
    console.log('');
    process.exit(1);
  }
}

/**
 * Bucket List Command
 */
async function bucketList() {
  console.log(chalk.cyan('\n============================================================'));
  console.log(chalk.cyan('📋 Listing Storage Buckets'));
  console.log(chalk.cyan('============================================================\n'));

  const credentials = requireAuth();
  console.log(chalk.white('Workspace:'), chalk.yellow(credentials.workspace));

  const spinner = ora('Fetching buckets...').start();

  try {
    const response = await makeApiRequest(
      'GET',
      API_ENDPOINTS.STORAGE_BUCKET_LIST,
      credentials
    );

    spinner.succeed(chalk.green(`✓ Found ${response.count} bucket(s)`));

    if (response.count === 0) {
      console.log(chalk.yellow('\n📭 No buckets found'));
      console.log(chalk.cyan('\n💡 Create your first bucket:'));
      console.log(chalk.white('  '), chalk.yellow('orcapt storage bucket create my-bucket'));
      console.log('');
      return;
    }

    console.log('');
    console.log(chalk.white('─'.repeat(100)));
    console.log(
      chalk.white('NAME').padEnd(25),
      chalk.white('FILES').padEnd(10),
      chalk.white('SIZE').padEnd(15),
      chalk.white('VISIBILITY').padEnd(15),
      chalk.white('STATUS').padEnd(15),
      chalk.white('CREATED')
    );
    console.log(chalk.white('─'.repeat(100)));

    response.buckets.forEach(bucket => {
      const name = bucket.bucket_name.padEnd(25);
      const files = String(bucket.file_count).padEnd(10);
      const size = bucket.total_size.padEnd(15);
      const visibility = bucket.visibility.padEnd(15);
      const status = bucket.status === 'active' 
        ? chalk.green(bucket.status.padEnd(15))
        : chalk.yellow(bucket.status.padEnd(15));
      const created = new Date(bucket.created_at).toLocaleDateString();

      console.log(
        chalk.yellow(name),
        chalk.white(files),
        chalk.cyan(size),
        visibility === 'public      ' ? chalk.green(visibility) : chalk.gray(visibility),
        status,
        chalk.gray(created)
      );
    });

    console.log(chalk.white('─'.repeat(100)));
    console.log('');

  } catch (error) {
    spinner.fail(chalk.red('✗ Failed to list buckets'));
    
    if (error.response) {
      console.log(chalk.red(`\n✗ ${error.response.message || 'Unknown error'}\n`));
    } else {
      console.log(chalk.red(`\n✗ ${error.message}\n`));
    }
    process.exit(1);
  }
}

/**
 * File Upload Command
 */
async function fileUpload(bucketName, localPath, options = {}) {
  console.log(chalk.cyan('\n============================================================'));
  console.log(chalk.cyan('📤 Uploading File'));
  console.log(chalk.cyan('============================================================\n'));

  const credentials = requireAuth();

  // Check if file exists
  if (!fs.existsSync(localPath)) {
    console.log(chalk.red(`✗ File not found: ${localPath}\n`));
    process.exit(1);
  }

  const fileStats = fs.statSync(localPath);
  const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);
  const fileName = path.basename(localPath);

  console.log(chalk.white('Bucket:     '), chalk.yellow(bucketName));
  console.log(chalk.white('File:       '), chalk.yellow(fileName));
  console.log(chalk.white('Local Path: '), chalk.gray(localPath));
  console.log(chalk.white('Size:       '), chalk.yellow(`${fileSizeMB} MB`));
  
  if (options.folder) {
    console.log(chalk.white('Folder:     '), chalk.yellow(options.folder));
  }
  
  console.log(chalk.white('Visibility: '), chalk.yellow(options.public ? 'public' : 'private'));

  const spinner = ora('Uploading file...').start();

  try {
    const uploadOptions = {
      folder: options.folder || '',
      visibility: options.public ? 'public' : 'private'
    };

    const response = await uploadFileToApi(
      API_ENDPOINTS.STORAGE_UPLOAD,
      credentials,
      localPath,
      bucketName,
      uploadOptions
    );

    spinner.succeed(chalk.green('✓ File uploaded successfully!'));
    
    console.log(chalk.cyan('\n📄 File Details:'));
    console.log(chalk.white('  Name:       '), chalk.yellow(response.file.file_name));
    console.log(chalk.white('  Key:        '), chalk.gray(response.file.file_key));
    console.log(chalk.white('  Size:       '), chalk.yellow(response.file.file_size));
    console.log(chalk.white('  Type:       '), chalk.yellow(response.file.mime_type));
    console.log(chalk.white('  Visibility: '), chalk.yellow(response.file.visibility));
    
    if (response.file.download_url) {
      console.log(chalk.cyan('\n🔗 Download URL (valid for 60 minutes):'));
      console.log(chalk.gray(response.file.download_url));
    }
    
    console.log(chalk.cyan('\n💡 Next Steps:'));
    console.log(chalk.white('  List files:   '), chalk.yellow(`orcapt storage files ${bucketName}`));
    console.log(chalk.white('  Download:     '), chalk.yellow(`orcapt storage download ${bucketName} ${response.file.file_key}`));
    console.log('');

  } catch (error) {
    spinner.fail(chalk.red('✗ Upload failed'));
    
    if (error.response) {
      console.log(chalk.red(`\n✗ ${error.response.message || 'Unknown error'}`));
      if (error.statusCode === 404) {
        console.log(chalk.yellow('  Bucket not found'));
      } else if (error.statusCode === 413) {
        console.log(chalk.yellow('  File too large (max 100MB)'));
      }
    } else {
      console.log(chalk.red(`\n✗ ${error.message}`));
    }
    console.log('');
    process.exit(1);
  }
}

/**
 * File Download Command
 */
async function fileDownload(bucketName, fileKey, localPath) {
  console.log(chalk.cyan('\n============================================================'));
  console.log(chalk.cyan('📥 Downloading File'));
  console.log(chalk.cyan('============================================================\n'));

  const credentials = requireAuth();

  console.log(chalk.white('Bucket:     '), chalk.yellow(bucketName));
  console.log(chalk.white('File Key:   '), chalk.yellow(fileKey));
  console.log(chalk.white('Local Path: '), chalk.yellow(localPath || 'current directory'));

  const spinner = ora('Getting download URL...').start();

  try {
    // Get pre-signed download URL from API
    const encodedFileKey = encodeURIComponent(fileKey);
    const response = await makeApiRequest(
      'GET',
      API_ENDPOINTS.STORAGE_DOWNLOAD.replace('{bucketName}', bucketName).replace('{fileKey}', encodedFileKey),
      credentials
    );

    spinner.text = 'Downloading file...';

    // Download file from S3 using pre-signed URL
    const downloadUrl = response.download_url;
    const fileName = response.file.file_name;
    const outputPath = localPath || fileName;

    // Download file using the pre-signed URL
    await new Promise((resolve, reject) => {
      const urlObj = new URL(downloadUrl);
      const isHttps = urlObj.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const fileWriter = fs.createWriteStream(outputPath);
      
      httpModule.get(downloadUrl, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download: ${res.statusCode}`));
          return;
        }

        res.pipe(fileWriter);

        fileWriter.on('finish', () => {
          fileWriter.close();
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(outputPath, () => {});
        reject(err);
      });

      fileWriter.on('error', (err) => {
        fs.unlink(outputPath, () => {});
        reject(err);
      });
    });

    spinner.succeed(chalk.green('✓ File downloaded successfully!'));
    
    console.log(chalk.cyan('\n📄 File Details:'));
    console.log(chalk.white('  Name:     '), chalk.yellow(response.file.file_name));
    console.log(chalk.white('  Size:     '), chalk.yellow(formatBytes(response.file.file_size_bytes)));
    console.log(chalk.white('  Type:     '), chalk.yellow(response.file.mime_type));
    console.log(chalk.white('  Location: '), chalk.gray(path.resolve(outputPath)));
    console.log('');

  } catch (error) {
    spinner.fail(chalk.red('✗ Download failed'));
    
    if (error.response) {
      console.log(chalk.red(`\n✗ ${error.response.message || 'Unknown error'}`));
      if (error.statusCode === 404) {
        console.log(chalk.yellow('  File or bucket not found'));
      }
    } else {
      console.log(chalk.red(`\n✗ ${error.message}`));
    }
    console.log('');
    process.exit(1);
  }
}

/**
 * Bucket Info Command
 */
async function bucketInfo(bucketName) {
  console.log(chalk.cyan('\n============================================================'));
  console.log(chalk.cyan('ℹ️  Bucket Information'));
  console.log(chalk.cyan('============================================================\n'));

  const credentials = requireAuth();
  const spinner = ora('Fetching bucket info...').start();

  try {
    const response = await makeApiRequest(
      'GET',
      API_ENDPOINTS.STORAGE_BUCKET_LIST.replace('/list', `/${bucketName}`),
      credentials
    );

    spinner.succeed(chalk.green('✓ Bucket info retrieved'));

    const bucket = response.bucket;

    console.log(chalk.cyan('\n📦 Bucket Details:'));
    console.log(chalk.white('  Name:          '), chalk.yellow(bucket.bucket_name));
    console.log(chalk.white('  AWS Bucket:    '), chalk.gray(bucket.aws_bucket_name));
    console.log(chalk.white('  Region:        '), chalk.yellow(bucket.region));
    console.log(chalk.white('  Status:        '), bucket.status === 'active' ? chalk.green(bucket.status) : chalk.yellow(bucket.status));
    console.log(chalk.white('  Visibility:    '), bucket.visibility === 'public' ? chalk.green(bucket.visibility) : chalk.gray(bucket.visibility));
    console.log(chalk.white('  Files:         '), chalk.yellow(bucket.file_count));
    console.log(chalk.white('  Total Size:    '), chalk.cyan(bucket.total_size));
    console.log(chalk.white('  Versioning:    '), bucket.versioning_enabled ? chalk.green('Enabled') : chalk.gray('Disabled'));
    console.log(chalk.white('  Encryption:    '), bucket.encryption_enabled ? chalk.green(`Enabled (${bucket.encryption_type})`) : chalk.gray('Disabled'));
    
    if (bucket.description) {
      console.log(chalk.white('  Description:   '), chalk.gray(bucket.description));
    }
    
    console.log(chalk.white('  Created:       '), chalk.gray(new Date(bucket.created_at).toLocaleString()));
    console.log('');

  } catch (error) {
    spinner.fail(chalk.red('✗ Failed to get bucket info'));
    
    if (error.response) {
      console.log(chalk.red(`\n✗ ${error.response.message || 'Unknown error'}`));
      if (error.statusCode === 404) {
        console.log(chalk.yellow('  Bucket not found'));
      }
    } else {
      console.log(chalk.red(`\n✗ ${error.message}`));
    }
    console.log('');
    process.exit(1);
  }
}

/**
 * Bucket Delete Command
 */
async function bucketDelete(bucketName, options = {}) {
  console.log(chalk.cyan('\n============================================================'));
  console.log(chalk.cyan('🗑️  Deleting Storage Bucket'));
  console.log(chalk.cyan('============================================================\n'));

  const credentials = requireAuth();

  console.log(chalk.white('Bucket:   '), chalk.yellow(bucketName));
  console.log(chalk.white('Workspace:'), chalk.yellow(credentials.workspace));
  
  if (options.force) {
    console.log(chalk.yellow('\n⚠️  Force delete enabled - all files will be deleted'));
  }

  const spinner = ora('Deleting bucket...').start();

  try {
    const endpoint = API_ENDPOINTS.STORAGE_BUCKET_LIST.replace('/list', `/${bucketName}`) + 
                    (options.force ? '?force=true' : '');
    
    await makeApiRequest('DELETE', endpoint, credentials);

    spinner.succeed(chalk.green('✓ Bucket deleted successfully!'));
    console.log('');

  } catch (error) {
    spinner.fail(chalk.red('✗ Failed to delete bucket'));
    
    if (error.response) {
      console.log(chalk.red(`\n✗ ${error.response.message || 'Unknown error'}`));
      if (error.statusCode === 404) {
        console.log(chalk.yellow('  Bucket not found'));
      } else if (error.statusCode === 400 && error.response.file_count) {
        console.log(chalk.yellow(`  Bucket contains ${error.response.file_count} file(s)`));
        console.log(chalk.cyan('  Use --force to delete anyway:'));
        console.log(chalk.white('  '), chalk.yellow(`orcapt storage bucket delete ${bucketName} --force`));
      }
    } else {
      console.log(chalk.red(`\n✗ ${error.message}`));
    }
    console.log('');
    process.exit(1);
  }
}

/**
 * File List Command
 */
async function fileList(bucketName, options = {}) {
  console.log(chalk.cyan('\n============================================================'));
  console.log(chalk.cyan('📁 Listing Files'));
  console.log(chalk.cyan('============================================================\n'));

  const credentials = requireAuth();

  console.log(chalk.white('Bucket:'), chalk.yellow(bucketName));
  if (options.folder) {
    console.log(chalk.white('Folder:'), chalk.yellow(options.folder));
  }

  const spinner = ora('Fetching files...').start();

  try {
    let endpoint = API_ENDPOINTS.STORAGE_FILE_LIST.replace('{bucketName}', bucketName);
    const params = [];
    
    if (options.folder) {
      params.push(`folder_path=${encodeURIComponent(options.folder)}`);
    }
    if (options.page) {
      params.push(`page=${options.page}`);
    }
    if (options.perPage) {
      params.push(`per_page=${options.perPage}`);
    }
    
    if (params.length > 0) {
      endpoint += '?' + params.join('&');
    }

    const response = await makeApiRequest('GET', endpoint, credentials);

    spinner.succeed(chalk.green(`✓ Found ${response.pagination.total} file(s)`));

    if (response.pagination.total === 0) {
      console.log(chalk.yellow('\n📭 No files found'));
      console.log(chalk.cyan('\n💡 Upload a file:'));
      console.log(chalk.white('  '), chalk.yellow(`orcapt storage upload ${bucketName} <file-path>`));
      console.log('');
      return;
    }

    console.log('');
    console.log(chalk.white('─'.repeat(120)));
    console.log(
      chalk.white('NAME').padEnd(40),
      chalk.white('SIZE').padEnd(15),
      chalk.white('TYPE').padEnd(20),
      chalk.white('DOWNLOADS').padEnd(12),
      chalk.white('UPLOADED')
    );
    console.log(chalk.white('─'.repeat(120)));

    response.files.forEach(file => {
      const name = (file.file_name.length > 38 
        ? file.file_name.substring(0, 35) + '...' 
        : file.file_name).padEnd(40);
      const size = file.file_size.padEnd(15);
      const type = (file.mime_type.length > 18 
        ? file.mime_type.substring(0, 15) + '...' 
        : file.mime_type).padEnd(20);
      const downloads = String(file.download_count).padEnd(12);
      const uploaded = new Date(file.uploaded_at).toLocaleDateString();

      console.log(
        chalk.yellow(name),
        chalk.cyan(size),
        chalk.gray(type),
        chalk.white(downloads),
        chalk.gray(uploaded)
      );
    });

    console.log(chalk.white('─'.repeat(120)));
    
    if (response.pagination.last_page > 1) {
      console.log(chalk.gray(`Page ${response.pagination.current_page} of ${response.pagination.last_page}`));
      if (response.pagination.current_page < response.pagination.last_page) {
        console.log(chalk.cyan('Next page: '), chalk.yellow(`orcapt storage files ${bucketName} --page ${response.pagination.current_page + 1}`));
      }
    }
    
    console.log('');

  } catch (error) {
    spinner.fail(chalk.red('✗ Failed to list files'));
    
    if (error.response) {
      console.log(chalk.red(`\n✗ ${error.response.message || 'Unknown error'}`));
      if (error.statusCode === 404) {
        console.log(chalk.yellow('  Bucket not found'));
      }
    } else {
      console.log(chalk.red(`\n✗ ${error.message}`));
    }
    console.log('');
    process.exit(1);
  }
}

/**
 * File Delete Command
 */
async function fileDelete(bucketName, fileKey) {
  console.log(chalk.cyan('\n============================================================'));
  console.log(chalk.cyan('🗑️  Deleting File'));
  console.log(chalk.cyan('============================================================\n'));

  const credentials = requireAuth();

  console.log(chalk.white('Bucket:  '), chalk.yellow(bucketName));
  console.log(chalk.white('File Key:'), chalk.yellow(fileKey));

  const spinner = ora('Deleting file...').start();

  try {
    const encodedFileKey = encodeURIComponent(fileKey);
    const endpoint = API_ENDPOINTS.STORAGE_FILE_DELETE
      .replace('{bucketName}', bucketName)
      .replace('{fileKey}', encodedFileKey);

    await makeApiRequest('DELETE', endpoint, credentials);

    spinner.succeed(chalk.green('✓ File deleted successfully!'));
    console.log('');

  } catch (error) {
    spinner.fail(chalk.red('✗ Failed to delete file'));
    
    if (error.response) {
      console.log(chalk.red(`\n✗ ${error.response.message || 'Unknown error'}`));
      if (error.statusCode === 404) {
        console.log(chalk.yellow('  File or bucket not found'));
      }
    } else {
      console.log(chalk.red(`\n✗ ${error.message}`));
    }
    console.log('');
    process.exit(1);
  }
}

/**
 * Permission Add Command
 */
async function permissionAdd(bucketName, options = {}) {
  console.log(chalk.cyan('\n============================================================'));
  console.log(chalk.cyan('🔐 Adding Permission'));
  console.log(chalk.cyan('============================================================\n'));

  const credentials = requireAuth();

  console.log(chalk.white('Bucket:       '), chalk.yellow(bucketName));
  console.log(chalk.white('Target Type:  '), chalk.yellow(options.targetType || 'user'));
  console.log(chalk.white('Target ID:    '), chalk.yellow(options.targetId || 'N/A'));
  console.log(chalk.white('Resource Type:'), chalk.yellow(options.resourceType || 'bucket'));

  const spinner = ora('Adding permission...').start();

  try {
    const requestBody = {
      target_type: options.targetType || 'user',
      target_id: options.targetId,
      resource_type: options.resourceType || 'bucket',
      resource_path: options.resourcePath || null,
      can_read: options.read || false,
      can_write: options.write || false,
      can_delete: options.delete || false,
      can_list: options.list || false,
      valid_until: options.validUntil || null,
      reason: options.reason || null
    };

    const endpoint = API_ENDPOINTS.STORAGE_PERMISSION_ADD
      .replace('{bucketName}', bucketName);

    const response = await makeApiRequest('POST', endpoint, credentials, requestBody);

    spinner.succeed(chalk.green('✓ Permission added successfully!'));
    
    console.log(chalk.cyan('\n🔐 Permission Details:'));
    console.log(chalk.white('  ID:            '), chalk.yellow(response.permission.id));
    console.log(chalk.white('  Target:        '), chalk.yellow(`${response.permission.target_type}:${response.permission.target_id || 'all'}`));
    console.log(chalk.white('  Resource:      '), chalk.yellow(`${response.permission.resource_type}:${response.permission.resource_path || 'all'}`));
    console.log(chalk.white('  Permissions:   '), chalk.green(response.permission.permissions.join(', ')));
    
    if (response.permission.valid_until) {
      console.log(chalk.white('  Valid Until:   '), chalk.gray(new Date(response.permission.valid_until).toLocaleString()));
    }
    
    console.log('');

  } catch (error) {
    spinner.fail(chalk.red('✗ Failed to add permission'));
    
    if (error.response) {
      console.log(chalk.red(`\n✗ ${error.response.message || 'Unknown error'}`));
      if (error.statusCode === 404) {
        console.log(chalk.yellow('  Bucket not found'));
      } else if (error.statusCode === 422) {
        console.log(chalk.yellow('  Invalid permission parameters'));
      }
    } else {
      console.log(chalk.red(`\n✗ ${error.message}`));
    }
    console.log('');
    process.exit(1);
  }
}

/**
 * Permission List Command
 */
async function permissionList(bucketName) {
  console.log(chalk.cyan('\n============================================================'));
  console.log(chalk.cyan('🔐 Listing Permissions'));
  console.log(chalk.cyan('============================================================\n'));

  const credentials = requireAuth();
  console.log(chalk.white('Bucket:'), chalk.yellow(bucketName));

  const spinner = ora('Fetching permissions...').start();

  try {
    const endpoint = API_ENDPOINTS.STORAGE_PERMISSION_LIST
      .replace('{bucketName}', bucketName);

    const response = await makeApiRequest('GET', endpoint, credentials);

    spinner.succeed(chalk.green(`✓ Found ${response.count} permission(s)`));

    if (response.count === 0) {
      console.log(chalk.yellow('\n📭 No permissions found'));
      console.log(chalk.cyan('\n💡 Add a permission:'));
      console.log(chalk.white('  '), chalk.yellow(`orcapt storage permission add ${bucketName} --target-type user --target-id USER_ID --read`));
      console.log('');
      return;
    }

    console.log('');
    response.permissions.forEach(perm => {
      const statusIcon = perm.is_valid ? '✓' : '✗';
      const statusColor = perm.is_valid ? chalk.green : chalk.red;
      
      console.log(statusColor(`${statusIcon} Permission #${perm.id}`));
      console.log(chalk.white('  Target:     '), chalk.yellow(`${perm.target_type}:${perm.target_id || 'all'}`));
      console.log(chalk.white('  Resource:   '), chalk.yellow(`${perm.resource_type}:${perm.resource_path || 'all'}`));
      console.log(chalk.white('  Actions:    '), chalk.green(perm.permissions.join(', ')));
      console.log(chalk.white('  Status:     '), statusColor(perm.status));
      
      if (perm.valid_until) {
        console.log(chalk.white('  Valid Until:'), chalk.gray(new Date(perm.valid_until).toLocaleString()));
      }
      
      console.log('');
    });

  } catch (error) {
    spinner.fail(chalk.red('✗ Failed to list permissions'));
    
    if (error.response) {
      console.log(chalk.red(`\n✗ ${error.response.message || 'Unknown error'}\n`));
    } else {
      console.log(chalk.red(`\n✗ ${error.message}\n`));
    }
    process.exit(1);
  }
}

module.exports = {
  bucketCreate,
  bucketList,
  bucketInfo,
  bucketDelete,
  fileUpload,
  fileDownload,
  fileList,
  fileDelete,
  permissionAdd,
  permissionList
};

