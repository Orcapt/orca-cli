# Changelog

All notable changes to Lexia CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2025-11-30

### 🚀 Major Features Added

#### Lambda Deployment

- **NEW**: `lexia ship <function-name>` - Deploy Docker images to AWS Lambda
- Automatic ECR repository creation and management
- Real-time progress bar for Docker image push
- Support for custom memory and timeout settings
- Environment variables support via `--env` flags
- `.env` file support via `--env-file` flag
- Automatic Function URL creation with public access
- Smart function updates (update existing instead of creating duplicates)

#### Lambda Management

- `lexia lambda list` - List all Lambda functions
- `lexia lambda info <function-name>` - Get function details
- `lexia lambda invoke <function-name>` - Invoke functions with optional payload
- `lexia lambda logs <function-name>` - View function logs
- `lexia lambda remove <function-name>` - Delete functions

#### Storage Management

- **Bucket Management**:
  - `lexia storage bucket create` - Create S3-compatible buckets
  - `lexia storage bucket list` - List all buckets
  - `lexia storage bucket info` - Get bucket details
  - `lexia storage bucket delete` - Delete buckets (with `--force` option)
- **File Management**:
  - `lexia storage upload` - Upload files to buckets
  - `lexia storage download` - Download files from buckets
  - `lexia storage files` - List files in buckets
  - `lexia storage delete` - Delete files from buckets
- **Permission Management**:
  - `lexia storage permission add` - Add bucket permissions
  - `lexia storage permission list` - List bucket permissions

#### Database Management

- `lexia db create` - Create PostgreSQL databases
- `lexia db list` - List all databases
- `lexia db remove` - Delete databases

#### Authentication

- `lexia login` - Authenticate with Lexia platform
- `lexia logout` - Clear stored credentials
- `lexia status` - Check authentication status and workspace info

### ✨ Enhancements

#### Docker Integration

- Improved Docker helper utilities
- Real-time progress tracking for image push
- Layer-by-layer progress visualization
- Automatic retry logic for ECR login (3 retries with timeout)
- Better error messages for Docker-related issues

#### Environment Variables

- Parse `KEY=VALUE` format from `--env` flags
- Read and parse `.env` files
- Support for quoted values in `.env` files
- Skip comments and empty lines in `.env` files
- Override `.env` values with `--env` flags
- Environment variable count display during deployment

#### User Experience

- Colorful terminal output with `chalk`
- Progress spinners with `ora`
- Detailed step-by-step deployment feedback
- Clear error messages with troubleshooting tips
- Consistent command structure across all features

### 📚 Documentation

- Comprehensive README with all commands
- `ENVIRONMENT_VARIABLES.md` - Complete guide for env vars
- `PROGRESS_BAR_ENHANCEMENT.md` - Progress bar implementation details
- Example Dockerfiles for FastAPI Lambda deployment
- Troubleshooting section for common issues

### 🔧 Technical Improvements

- Refactored controller structure (split into smaller controllers)
- Proxy pattern for `databaseasservice` to `gptclone-api`
- Improved error handling across all commands
- Better API request/response handling
- Timeout and retry logic for network operations

### 🐛 Bug Fixes

- Fixed AWS credentials configuration
- Fixed DNS resolution issues in Docker containers
- Fixed Lambda Function URL CORS configuration
- Fixed Lambda function update conflicts (409 errors)
- Fixed duplicate deployment creation issue
- Fixed environment variable parsing from arrays to objects

---

## [1.0.0] - 2025-10-15

### Initial Release

#### Kickstart Commands

- `lexia kickstart python` - Python-based agent setup
- `lexia kickstart node` - Node.js-based agent setup
- Automatic virtual environment creation
- Dependency installation
- Backend and frontend auto-start

#### UI Management

- `lexia ui init` - Install Lexia UI globally
- `lexia ui start` - Start the Lexia UI
- `lexia ui remove` - Uninstall Lexia UI

#### Documentation

- `lexia fetch doc` - Download SDK documentation

#### Core Features

- Cross-platform support (Windows, macOS, Linux)
- Beautiful terminal UI with colors and spinners
- Process management for backend and frontend
- Automatic prerequisite checking

---

## Upcoming Features

### v2.1.0 (Planned)

- [ ] `lexia lambda rollback` - Rollback to previous version
- [ ] `lexia lambda alias` - Manage function aliases
- [ ] `lexia ship --auto-scale` - Auto-scaling configuration
- [ ] `lexia ship --vpc` - VPC configuration
- [ ] `lexia storage sync` - Sync local folder to bucket
- [ ] `lexia storage cdn` - CDN configuration

### v2.2.0 (Planned)

- [ ] `lexia stop` - Stop running servers
- [ ] `lexia restart` - Restart servers
- [ ] `lexia update` - Update Lexia packages
- [ ] `lexia config` - Configure Lexia settings
- [ ] `lexia logs` - View all logs

### v3.0.0 (Future)

- [ ] `lexia kickstart go` - Go-based agent
- [ ] `lexia kickstart rust` - Rust-based agent
- [ ] `lexia kickstart typescript` - TypeScript-based agent
- [ ] Multi-region deployment support
- [ ] CI/CD pipeline integration
- [ ] Monitoring and alerting

---

## Migration Guide

### From v1.x to v2.0

#### Authentication Required

All commands now require authentication. Run `lexia login` before using any command.

```bash
# Before
lexia kickstart python

# After
lexia login
lexia kickstart python
```

#### New Lambda Deployment

The new `ship` command replaces manual Lambda deployment:

```bash
# Old way (manual)
docker build -t my-app .
docker tag my-app:latest ECR_URL/my-app:latest
docker push ECR_URL/my-app:latest
# ... manual Lambda configuration ...

# New way (automatic)
docker build -t my-app:latest .
lexia ship my-api --image=my-app:latest
```

#### Storage Management

Storage commands are now organized under `lexia storage`:

```bash
# Bucket operations
lexia storage bucket create my-bucket
lexia storage bucket list

# File operations
lexia storage upload my-bucket ./file.txt
lexia storage files my-bucket
```

---

## Breaking Changes

### v2.0.0

- **Authentication**: All commands now require authentication via `lexia login`
- **Command Structure**: Storage and database commands moved under subcommands
- **Environment**: Node.js 14+ now required (was 12+)

---

## Contributors

- **Lexia Team** - Initial work and ongoing development
- **Community Contributors** - Bug reports and feature requests

---

**Made with ❤️ by the Lexia Team**
