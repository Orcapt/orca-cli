# @orcapt/cli

> A powerful command-line tool for managing Orca projects. Set up and run your AI agent in seconds! 🚀

## ✨ Features

- 🎯 **One Command Setup** - Clone, configure, and run with `orcapt kickstart <language>`
- 🌐 **Multi-Language Support** - Python ✅ | Node.js ✅ | Go (coming soon)
- 🖥️ **Cross-Platform** - Works on Windows, Linux, and macOS
- 📦 **No Dependencies** - Just Node.js (which you already have!)
- 🎨 **Beautiful UI** - Colorful output with progress indicators
- ⚡ **Fast** - Node.js native performance
- 🔄 **Process Management** - Manages both backend and frontend automatically
- 🚀 **Lambda Deployment** - Deploy Docker images to AWS Lambda with one command
- 💾 **Storage Management** - Manage S3-compatible storage buckets and files
- 🗄️ **Database Management** - Create and manage PostgreSQL databases

## 🌟 What's New

### Latest Features (v2.0)

- 🚀 **`orcapt ship`** - Deploy Docker images to AWS Lambda in one command!
- 📊 **Real-time Progress Bar** - See exactly how much of your image has been pushed
- 🔐 **Environment Variables** - Support for `.env` files and `--env` flags
- 💾 **Storage Management** - Full S3-compatible storage with buckets, files, and permissions
- 🗄️ **Database Management** - PostgreSQL database creation and management
- 🔑 **Authentication** - Secure workspace-based authentication

---

## 📦 Installation

### Quick Install (Recommended)

```bash
# Install globally via npm
npm install -g @orcapt/cli

# Or use it directly with npx (no installation needed)
npx @orcapt/cli kickstart python
```

### Install from Source

```bash
# Clone the repository
git clone https://github.com/Orcapt/orca-cli
cd orca-cli

# Install dependencies
npm install

# Link globally
npm link
```

## 🚀 Quick Start

### Prerequisites

Make sure you have these installed:

- **Node.js** 14+ (you already have this!)
- **Python** 3.8+ (for Python starter kit)
- **Git**
- **Docker** (for Lambda deployments)

### Authentication

First, authenticate with Orca:

```bash
orcapt login
```

### Usage

Create and run a new Orca Python agent in one command:

```bash
orcapt kickstart python
```

That's it! This will:

1. ✅ Check prerequisites (Python, Git, Node.js)
2. 📁 Create `orca-kickstart` directory
3. 📦 Clone the [starter kit](https://github.com/Orcapt/orca-starter-kit-python-v1)
4. 🐍 Set up Python virtual environment
5. 📥 Install all dependencies
6. 🚀 Start backend (port 5001)
7. 🎨 Start frontend (port 3000)

## 📖 Command Reference

### Authentication Commands

#### `orcapt login`

Authenticate with Orca platform.

```bash
orcapt login
```

#### `orcapt logout`

Clear stored credentials.

```bash
orcapt logout
```

#### `orcapt status`

Check authentication status and workspace info.

```bash
orcapt status
```

---

### `orcapt kickstart <language>`

Quick setup for a new Orca project in your preferred language.

#### Available Languages:

- **`python`** - Python-based agent (FastAPI + OpenAI) ✅ Available now
- **`node`** - Node.js-based agent (Express + OpenAI) ✅ Available now
- **`go`** - Go-based agent 🚧 Coming soon

#### `orcapt kickstart python`

Set up a Python-based Orca agent with FastAPI and OpenAI.

**Options:**

```bash
-d, --directory <name>      Directory name (default: "orca-kickstart")
-p, --port <number>         Frontend port (default: 3000)
-a, --agent-port <number>   Backend port (default: 5001)
--no-start                  Skip auto-starting servers
```

**Examples:**

```bash
# Basic usage
orcapt kickstart python

# Custom directory name
orcapt kickstart python --directory my-awesome-agent

# Custom ports
orcapt kickstart python --port 8080 --agent-port 8000

# Setup without auto-start
orcapt kickstart python --no-start

# All options combined
orcapt kickstart python -d my-agent -p 4000 -a 5000
```

#### `orcapt kickstart node`

Set up a Node.js-based Orca agent with Express and OpenAI.

**Options:** Same as Python (see above)

**Examples:**

```bash
# Basic usage
orcapt kickstart node

# Custom directory name
orcapt kickstart node --directory my-node-agent

# Custom ports
orcapt kickstart node --port 8080 --agent-port 8000

# All options combined
orcapt kickstart node -d my-agent -p 4000 -a 5000
```

#### Coming Soon:

```bash
# Go agent (coming soon)
orcapt kickstart go
```

---

### 🚀 `orcapt ship <function-name>`

Deploy Docker images to AWS Lambda with one command!

**Syntax:**

```bash
orcapt ship <function-name> [options]
```

**Options:**

- `--image <image>` - Docker image (registry/image:tag) **[Required]**
- `--memory <mb>` - Memory in MB (default: 512)
- `--timeout <seconds>` - Timeout in seconds (default: 30)
- `--env <key=value>` - Environment variable (can be repeated)
- `--env-file <path>` - Path to .env file

**Examples:**

```bash
# Basic deployment
orcapt ship my-api --image=my-app:latest

# With custom memory and timeout
orcapt ship my-api \
  --image=my-app:latest \
  --memory=1024 \
  --timeout=60

# With environment variables
orcapt ship my-api \
  --image=my-app:latest \
  --env DATABASE_URL=postgres://... \
  --env API_KEY=secret123 \
  --env DEBUG=true

# With .env file
orcapt ship my-api \
  --image=my-app:latest \
  --env-file=.env

# Override .env with specific values
orcapt ship my-api \
  --image=my-app:latest \
  --env-file=.env \
  --env DEBUG=false
```

**What it does:**

1. ✅ Checks Docker installation
2. ✅ Validates local image exists
3. ✅ Requests ECR credentials from backend
4. ✅ Logs into AWS ECR
5. ✅ Tags image for ECR
6. ✅ Pushes image to ECR (with progress bar!)
7. ✅ Creates/updates Lambda function
8. ✅ Configures Function URL
9. ✅ Returns invoke URL

**Output:**

```bash
============================================================
🚀 Deploying Lambda Function
============================================================

Function:   my-api
Image:      my-app:latest
Memory:     1024 MB
Timeout:    60s
Workspace:  my-workspace
Env Vars:   3 variables

✓ Docker is installed and running
✓ Found image 'my-app:latest' (259 MB)
✓ ECR credentials received
✓ Logged into ECR
✓ Image tagged for ECR
✓ Image pushed to ECR [████████████████████] 100% (3/3 layers)
✓ Lambda function created
✓ API Gateway configured
✓ Deployment completed

============================================================
✓ Function deployed successfully!
============================================================

Function Details:
  Name:         my-api
  Image:        123456789.dkr.ecr.us-east-1.amazonaws.com/...
  Region:       us-east-1
  Memory:       1024 MB
  Timeout:      60s
  Status:       Active

Invoke URL:
  https://abc123.lambda-url.us-east-1.on.aws

Try it:
  curl https://abc123.lambda-url.us-east-1.on.aws
```

---

### Lambda Management Commands

#### `orcapt lambda list`

List all Lambda functions in your workspace.

```bash
orcapt lambda list
```

#### `orcapt lambda info <function-name>`

Get detailed information about a Lambda function.

```bash
orcapt lambda info my-api
```

#### `orcapt lambda invoke <function-name>`

Invoke a Lambda function.

```bash
# Simple invoke
orcapt lambda invoke my-api

# With JSON payload
orcapt lambda invoke my-api --payload '{"key": "value"}'
```

#### `orcapt lambda logs <function-name>`

View Lambda function logs.

```bash
# Recent logs
orcapt lambda logs my-api

# Stream logs in real-time
orcapt lambda logs my-api --tail

# Logs from last hour
orcapt lambda logs my-api --since 1h
```

#### `orcapt lambda remove <function-name>`

Delete a Lambda function.

```bash
orcapt lambda remove my-api
```

---

### 💾 Storage Commands

Manage S3-compatible storage buckets and files.

#### Bucket Management

```bash
# Create bucket
orcapt storage bucket create my-bucket

# Create public bucket with versioning
orcapt storage bucket create my-bucket --public --versioning

# List all buckets
orcapt storage bucket list

# Get bucket info
orcapt storage bucket info my-bucket

# Delete bucket
orcapt storage bucket delete my-bucket

# Force delete (removes all files)
orcapt storage bucket delete my-bucket --force
```

#### File Management

```bash
# Upload file
orcapt storage upload my-bucket ./file.txt

# Upload to specific folder
orcapt storage upload my-bucket ./file.txt --folder=/documents

# Upload as public file
orcapt storage upload my-bucket ./file.txt --public

# List files in bucket
orcapt storage files my-bucket

# List files in folder
orcapt storage files my-bucket --folder=/documents

# Download file
orcapt storage download my-bucket file.txt

# Download to specific path
orcapt storage download my-bucket file.txt ./downloads/

# Delete file
orcapt storage delete my-bucket file.txt
```

#### Permission Management

```bash
# Add permission
orcapt storage permission add my-bucket \
  --target-type=user \
  --target-id=user123 \
  --read \
  --write

# List permissions
orcapt storage permission list my-bucket
```

---

### 🗄️ Database Commands

Create and manage PostgreSQL databases.

```bash
# Create database
orcapt db create

# List all databases
orcapt db list

# Delete database
orcapt db remove my-database
```

---

### 🎨 UI Commands

Manage Orca UI installation.

```bash
# Install UI globally
orcapt ui init

# Start UI
orcapt ui start

# Start with custom ports
orcapt ui start --port 3000 --agent-port 5001

# Remove UI
orcapt ui remove
```

## 🎬 What It Looks Like

```bash
$ orcapt kickstart python

============================================================
🚀 Orca Kickstart - Python
============================================================

✓ Python found: python3
✓ Git found
✓ Node.js/npm found
✓ npx found

► Creating directory: orca-kickstart
✓ Created directory: /path/to/orca-kickstart

✓ Repository cloned successfully
✓ Virtual environment created
✓ Dependencies installed

============================================================
✓ Setup completed successfully!
============================================================

✓ Backend started (PID: 12345)
✓ Frontend started (PID: 12346)

============================================================
🎉 Orca is running!
============================================================

Frontend: http://localhost:3000
Backend:  http://localhost:5001

⚠ Press Ctrl+C to stop both servers
```

## 🛠️ Development

### Project Structure

```
orca-cli/
├── bin/
│   └── orca.js                    # CLI entry point (executable)
├── src/
│   ├── commands/
│   │   ├── kickstart-python.js     # Python kickstart
│   │   ├── kickstart-node.js       # Node.js kickstart
│   │   ├── login.js                # Authentication
│   │   ├── lambda.js               # Lambda deployment
│   │   ├── storage.js              # Storage management
│   │   ├── db.js                   # Database management
│   │   ├── ui.js                   # UI management
│   │   └── fetch-doc.js            # Documentation fetcher
│   ├── utils/
│   │   └── docker-helper.js        # Docker utilities
│   └── config.js                   # Configuration
├── package.json                    # Package configuration
├── README.md                       # This file
├── ENVIRONMENT_VARIABLES.md        # Environment variables guide
├── PROGRESS_BAR_ENHANCEMENT.md     # Progress bar documentation
└── .gitignore                      # Git ignore patterns
```

### Adding New Commands

1. Create a new file in `src/commands/`:

```javascript
// src/commands/mycommand.js
async function myCommand(options) {
  console.log("Hello from my command!");
}

module.exports = myCommand;
```

2. Register it in `bin/orca.js`:

```javascript
const myCommand = require("../src/commands/mycommand");

program.command("mycommand").description("My custom command").action(myCommand);
```

### Dependencies

- **commander** - CLI framework with elegant syntax
- **chalk** - Terminal styling and colors
- **ora** - Beautiful terminal spinners
- **inquirer** - Interactive prompts
- **simple-git** - Git operations
- **cross-spawn** - Cross-platform process spawning

## 🐛 Troubleshooting

### Kickstart Issues

**"Python not found"**

```bash
# Install Python 3.8+
# macOS: brew install python3
# Windows: https://www.python.org/downloads/
# Linux: sudo apt install python3
```

**"Git not found"**

```bash
# Install Git
# macOS: brew install git
# Windows: https://git-scm.com/downloads
# Linux: sudo apt install git
```

**"Directory already exists"**

```bash
# Use a different directory name
orcapt kickstart python --directory my-other-project

# Or remove the existing directory
rm -rf orca-kickstart
```

**"Port already in use"**

```bash
# Use different ports
orcapt kickstart python --port 4000 --agent-port 5000

# Or find and kill the process using the port
# macOS/Linux: lsof -ti:3000 | xargs kill
# Windows: netstat -ano | findstr :3000
```

### Lambda Deployment Issues

**"Docker not found"**

```bash
# Install Docker
# macOS: brew install --cask docker
# Windows: https://docs.docker.com/desktop/install/windows-install/
# Linux: https://docs.docker.com/engine/install/
```

**"Docker image not found"**

```bash
# Build your image first
docker build -t my-app:latest .

# Check if image exists
docker images | grep my-app
```

**"ECR login failed"**

```bash
# Check your authentication
orcapt status

# Re-login if needed
orcapt logout
orcapt login

# Check backend is running and AWS credentials are configured
```

**"Lambda deployment timeout"**

```bash
# Increase timeout
orcapt ship my-api --image=my-app:latest --timeout=120

# Check image size (should be < 10 GB)
docker images | grep my-app
```

**"Environment variables not working"**

```bash
# Check .env file format
cat .env

# Test with explicit --env flags
orcapt ship my-api --image=my-app:latest --env DEBUG=true

# Check Lambda function info
orcapt lambda info my-api
```

### Storage Issues

**"Bucket already exists"**

```bash
# Use a different bucket name
orcapt storage bucket create my-bucket-2

# Or delete existing bucket
orcapt storage bucket delete my-bucket --force
```

**"File upload failed"**

```bash
# Check file exists
ls -lh ./file.txt

# Check bucket exists
orcapt storage bucket list

# Try with absolute path
orcapt storage upload my-bucket /full/path/to/file.txt
```

### Platform-Specific Notes

#### Windows

- Uses `orca_env\Scripts\python.exe`
- Automatically handles Windows paths
- PowerShell and CMD supported

#### macOS/Linux

- Uses `orca_env/bin/python`
- Bash and Zsh supported

## 📝 Manual Setup

If you prefer to set up manually:

```bash
# After kickstart python (with --no-start)
cd orca-kickstart

# Activate virtual environment
source orca_env/bin/activate    # macOS/Linux
orca_env\Scripts\activate       # Windows

# Start backend
python main.py --dev

# In another terminal, start frontend
npx -y @orcapt/ui --port=3000 --agent-port=5001
```

## 🌐 Multi-Language Support

Orca CLI is designed to support multiple programming languages:

### Currently Available:

- ✅ **Python** - Full support with FastAPI + OpenAI
- ✅ **Node.js** - Full support with Express + OpenAI

### Coming Soon:

- 🚧 **Go** - Gin/Fiber + OpenAI

### Future Languages:

- TypeScript
- Rust
- Java
- C#/.NET

Want to contribute a starter kit in your favorite language? Check out our [Contributing Guide](#-contributing)!

## 🚢 Publishing to npm

To publish this package to npm:

```bash
# Login to npm
npm login

# Publish
npm publish

# Or publish as scoped package
npm publish --access public
```

## 🤝 Contributing

Contributions are welcome! Here's how:

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 💡 Quick Examples

### Example 1: Deploy FastAPI to Lambda

```bash
# 1. Create FastAPI app
mkdir my-api && cd my-api

# 2. Create Dockerfile
cat > Dockerfile << 'EOF'
FROM public.ecr.aws/lambda/python:3.11
COPY requirements.txt .
RUN pip install -r requirements.txt --target .
COPY . .
CMD ["lambda_adapter.handler"]
EOF

# 3. Create requirements.txt
cat > requirements.txt << 'EOF'
fastapi
mangum
EOF

# 4. Create main.py
cat > main.py << 'EOF'
from fastapi import FastAPI
app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Hello from Lambda!"}
EOF

# 5. Create lambda_adapter.py
cat > lambda_adapter.py << 'EOF'
from mangum import Mangum
from main import app
handler = Mangum(app)
EOF

# 6. Build Docker image
docker build -t my-api:latest .

# 7. Deploy to Lambda
orcapt ship my-api --image=my-api:latest --memory=1024 --timeout=60

# 8. Test
curl https://YOUR-FUNCTION-URL/
```

### Example 2: Deploy with Environment Variables

```bash
# Create .env file
cat > .env << 'EOF'
DATABASE_URL=postgresql://user:pass@host:5432/db
OPENAI_API_KEY=sk-...
DEBUG=false
EOF

# Deploy with .env
orcapt ship my-api \
  --image=my-api:latest \
  --env-file=.env \
  --memory=2048 \
  --timeout=120
```

### Example 3: Storage Workflow

```bash
# 1. Create bucket
orcapt storage bucket create my-files --public

# 2. Upload files
orcapt storage upload my-files ./document.pdf
orcapt storage upload my-files ./image.png --folder=/images

# 3. List files
orcapt storage files my-files

# 4. Download file
orcapt storage download my-files document.pdf

# 5. Add permissions
orcapt storage permission add my-files \
  --target-type=user \
  --target-id=user123 \
  --read --write
```

### Example 4: Complete Workflow

```bash
# 1. Login
orcapt login

# 2. Create database
orcapt db create

# 3. Create storage bucket
orcapt storage bucket create app-storage

# 4. Deploy Lambda function
orcapt ship my-app \
  --image=my-app:latest \
  --env DATABASE_URL=postgres://... \
  --env BUCKET_NAME=app-storage \
  --memory=1024

# 5. Check deployment
orcapt lambda info my-app

# 6. View logs
orcapt lambda logs my-app

# 7. Invoke function
orcapt lambda invoke my-app --payload '{"test": true}'
```

---

## 🙏 Support

- 📚 [Documentation](https://github.com/Orcapt/orca-starter-kit-python-v1)
- 🐛 [Report Issues](https://github.com/Orcapt/orca-cli/issues)
- 💬 [Discussions](https://github.com/Orcapt/orca-cli/discussions)

## 🎯 Roadmap

### ✅ Completed Features

- ✅ Authentication (`login`, `logout`, `status`)
- ✅ Kickstart for Python and Node.js
- ✅ Lambda deployment with Docker (`ship`)
- ✅ Storage management (buckets, files, permissions)
- ✅ Database management (PostgreSQL)
- ✅ UI management
- ✅ Environment variables support
- ✅ Progress bar for Docker push
- ✅ `.env` file support

### 🚧 Coming Soon

#### Commands

```bash
orcapt stop            # Stop running servers
orcapt restart         # Restart servers
orcapt update          # Update Orca packages
orcapt config          # Configure Orca settings
orcapt logs            # View all logs
```

#### Lambda Features

```bash
orcapt ship --auto-scale          # Auto-scaling configuration
orcapt ship --vpc                 # VPC configuration
orcapt lambda rollback            # Rollback to previous version
orcapt lambda alias               # Manage function aliases
```

#### Storage Features

```bash
orcapt storage sync               # Sync local folder to bucket
orcapt storage cdn                # CDN configuration
```

### Language Support

- ✅ **Python** - Available
- ✅ **Node.js** - Available
- 🚧 **Go** - Coming soon
- 🚧 **Rust** - Planned
- 🚧 **TypeScript** - Planned

---

**Made with ❤️ by the Orca Team**

Star ⭐ this repo if you find it helpful!
