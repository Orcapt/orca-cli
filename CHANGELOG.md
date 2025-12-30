# Changelog

All notable changes to Orca CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2025-11-30

### 🚀 Major Features Added

#### Lambda Deployment

- **NEW**: `orca ship <function-name>` - Deploy Docker images to AWS Lambda
- Automatic ECR repository creation and management
- Real-time progress bar for Docker image push
- Support for custom memory and timeout settings
- Environment variables support via `--env` flags
- `.env` file support via `--env-file` flag
- Automatic Function URL creation with public access
- Smart function updates (update existing instead of creating duplicates)

#### Lambda Management

- `orca lambda list` - List all Lambda functions
- `orca lambda info <function-name>` - Get function details
- `orca lambda invoke <function-name>` - Invoke functions with optional payload
- `orca lambda logs <function-name>` - View function logs
- `orca lambda remove <function-name>` - Delete functions

#### Storage Management

- **Bucket Management**:
  - `orca storage bucket create` - Create S3-compatible buckets
  - `orca storage bucket list` - List all buckets
  - `orca storage bucket info` - Get bucket details
  - `orca storage bucket delete` - Delete buckets (with `--force` option)
- **File Management**:
  - `orca storage upload` - Upload files to buckets
  - `orca storage download` - Download files from buckets
  - `orca storage files` - List files in buckets
  - `orca storage delete` - Delete files from buckets

#### Database Management

- `orca db create` - Create PostgreSQL databases
- `orca db list` - List all databases
- `orca db remove` - Delete databases

#### Authentication

- `orca login` - Authenticate with Orca platform
- `orca logout` - Clear stored credentials
- `orca status` - Check authentication status and workspace info

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

- `orca kickstart python` - Python-based agent setup
- `orca kickstart node` - Node.js-based agent setup
- Automatic virtual environment creation
- Dependency installation
- Backend and frontend auto-start

#### UI Management

- `orca ui init` - Install Orca UI globally
- `orca ui start` - Start the Orca UI
- `orca ui remove` - Uninstall Orca UI

#### Documentation

- `orca fetch doc` - Download SDK documentation

#### Core Features

- Cross-platform support (Windows, macOS, Linux)
- Beautiful terminal UI with colors and spinners
- Process management for backend and frontend
- Automatic prerequisite checking

---

## Upcoming Features

### v2.1.0 (Planned)

- [ ] `orca lambda rollback` - Rollback to previous version
- [ ] `orca lambda alias` - Manage function aliases
- [ ] `orca ship --auto-scale` - Auto-scaling configuration
- [ ] `orca ship --vpc` - VPC configuration
- [ ] `orca storage sync` - Sync local folder to bucket
- [ ] `orca storage cdn` - CDN configuration

### v2.2.0 (Planned)

- [ ] `orca stop` - Stop running servers
- [ ] `orca restart` - Restart servers
- [ ] `orca update` - Update Orca packages
- [ ] `orca config` - Configure Orca settings
- [ ] `orca logs` - View all logs

### v3.0.0 (Future)

- [ ] `orca kickstart go` - Go-based agent
- [ ] `orca kickstart rust` - Rust-based agent
- [ ] `orca kickstart typescript` - TypeScript-based agent
- [ ] Multi-region deployment support
- [ ] CI/CD pipeline integration
- [ ] Monitoring and alerting

---

## Migration Guide

### From v1.x to v2.0

#### Authentication Required

All commands now require authentication. Run `orca login` before using any command.

```bash
# Before
orca kickstart python

# After
orca login
orca kickstart python
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
orca ship my-api --image=my-app:latest
```

#### Storage Management

Storage commands are now organized under `orca storage`:

```bash
# Bucket operations
orca storage bucket create my-bucket
orca storage bucket list

# File operations
orca storage upload my-bucket ./file.txt
orca storage files my-bucket
```

---

## Breaking Changes

### v2.0.0

- **Authentication**: All commands now require authentication via `orca login`
- **Command Structure**: Storage and database commands moved under subcommands
- **Environment**: Node.js 14+ now required (was 12+)

---

## Contributors

- **Orca Team** - Initial work and ongoing development
- **Community Contributors** - Bug reports and feature requests

---

**Made with ❤️ by the Orca Team**
