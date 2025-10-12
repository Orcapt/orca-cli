# @lexia/cli

> A powerful command-line tool for managing Lexia projects. Set up and run your AI agent in seconds! 🚀

## ✨ Features

- 🎯 **One Command Setup** - Clone, configure, and run with `lexia kickstart <language>`
- 🌐 **Multi-Language Support** - Python ✅ | Node.js ✅ | Go (coming soon)
- 🖥️ **Cross-Platform** - Works on Windows, Linux, and macOS
- 📦 **No Dependencies** - Just Node.js (which you already have!)
- 🎨 **Beautiful UI** - Colorful output with progress indicators
- ⚡ **Fast** - Node.js native performance
- 🔄 **Process Management** - Manages both backend and frontend automatically

## 📦 Installation

### Quick Install (Recommended)

```bash
# Install globally via npm
npm install -g @lexia/cli

# Or use it directly with npx (no installation needed)
npx @lexia/cli kickstart python
```

### Install from Source

```bash
# Clone the repository
git clone https://github.com/Xalantico/lexia-cli
cd lexia-cli

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

### Usage

Create and run a new Lexia Python agent in one command:

```bash
lexia kickstart python
```

That's it! This will:
1. ✅ Check prerequisites (Python, Git, Node.js)
2. 📁 Create `lexia-kickstart` directory
3. 📦 Clone the [starter kit](https://github.com/Xalantico/lexia-starter-kit-python-v1)
4. 🐍 Set up Python virtual environment
5. 📥 Install all dependencies
6. 🚀 Start backend (port 5001)
7. 🎨 Start frontend (port 3000)

## 📖 Command Reference

### `lexia kickstart <language>`

Quick setup for a new Lexia project in your preferred language.

#### Available Languages:

- **`python`** - Python-based agent (FastAPI + OpenAI) ✅ Available now
- **`node`** - Node.js-based agent (Express + OpenAI) ✅ Available now
- **`go`** - Go-based agent 🚧 Coming soon

#### `lexia kickstart python`

Set up a Python-based Lexia agent with FastAPI and OpenAI.

**Options:**

```bash
-d, --directory <name>      Directory name (default: "lexia-kickstart")
-p, --port <number>         Frontend port (default: 3000)
-a, --agent-port <number>   Backend port (default: 5001)
--no-start                  Skip auto-starting servers
```

**Examples:**

```bash
# Basic usage
lexia kickstart python

# Custom directory name
lexia kickstart python --directory my-awesome-agent

# Custom ports
lexia kickstart python --port 8080 --agent-port 8000

# Setup without auto-start
lexia kickstart python --no-start

# All options combined
lexia kickstart python -d my-agent -p 4000 -a 5000
```

#### `lexia kickstart node`

Set up a Node.js-based Lexia agent with Express and OpenAI.

**Options:** Same as Python (see above)

**Examples:**

```bash
# Basic usage
lexia kickstart node

# Custom directory name
lexia kickstart node --directory my-node-agent

# Custom ports
lexia kickstart node --port 8080 --agent-port 8000

# All options combined
lexia kickstart node -d my-agent -p 4000 -a 5000
```

#### Coming Soon:

```bash
# Go agent (coming soon)
lexia kickstart go
```

## 🎬 What It Looks Like

```bash
$ lexia kickstart python

============================================================
🚀 Lexia Kickstart - Python
============================================================

✓ Python found: python3
✓ Git found
✓ Node.js/npm found
✓ npx found

► Creating directory: lexia-kickstart
✓ Created directory: /path/to/lexia-kickstart

✓ Repository cloned successfully
✓ Virtual environment created
✓ Dependencies installed

============================================================
✓ Setup completed successfully!
============================================================

✓ Backend started (PID: 12345)
✓ Frontend started (PID: 12346)

============================================================
🎉 Lexia is running!
============================================================

Frontend: http://localhost:3000
Backend:  http://localhost:5001

⚠ Press Ctrl+C to stop both servers
```

## 🛠️ Development

### Project Structure

```
lexia-cli/
├── bin/
│   └── lexia.js              # CLI entry point (executable)
├── src/
│   ├── commands/
│   │   └── kickstart.js      # Kickstart command implementation
│   └── utils/
│       └── index.js          # Utility functions
├── package.json              # Package configuration
├── README.md                 # This file
└── .gitignore               # Git ignore patterns
```

### Adding New Commands

1. Create a new file in `src/commands/`:

```javascript
// src/commands/mycommand.js
async function myCommand(options) {
  console.log('Hello from my command!');
}

module.exports = myCommand;
```

2. Register it in `bin/lexia.js`:

```javascript
const myCommand = require('../src/commands/mycommand');

program
  .command('mycommand')
  .description('My custom command')
  .action(myCommand);
```

### Dependencies

- **commander** - CLI framework with elegant syntax
- **chalk** - Terminal styling and colors
- **ora** - Beautiful terminal spinners
- **inquirer** - Interactive prompts
- **simple-git** - Git operations
- **cross-spawn** - Cross-platform process spawning

## 🐛 Troubleshooting

### Common Issues

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
lexia kickstart python --directory my-other-project

# Or remove the existing directory
rm -rf lexia-kickstart
```

**"Port already in use"**
```bash
# Use different ports
lexia kickstart python --port 4000 --agent-port 5000

# Or find and kill the process using the port
# macOS/Linux: lsof -ti:3000 | xargs kill
# Windows: netstat -ano | findstr :3000
```

### Platform-Specific Notes

#### Windows
- Uses `lexia_env\Scripts\python.exe`
- Automatically handles Windows paths
- PowerShell and CMD supported

#### macOS/Linux
- Uses `lexia_env/bin/python`
- Bash and Zsh supported

## 📝 Manual Setup

If you prefer to set up manually:

```bash
# After kickstart python (with --no-start)
cd lexia-kickstart

# Activate virtual environment
source lexia_env/bin/activate    # macOS/Linux
lexia_env\Scripts\activate       # Windows

# Start backend
python main.py --dev

# In another terminal, start frontend
npx -y @lexia/ui lexia --port=3000 --agent-port=5001
```

## 🌐 Multi-Language Support

Lexia CLI is designed to support multiple programming languages:

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

## 🙏 Support

- 📚 [Documentation](https://github.com/Xalantico/lexia-starter-kit-python-v1)
- 🐛 [Report Issues](https://github.com/Xalantico/lexia-cli/issues)
- 💬 [Discussions](https://github.com/Xalantico/lexia-cli/discussions)

## 🎯 Roadmap

### Commands (Coming Soon)

```bash
lexia status          # Check running Lexia instances
lexia stop            # Stop running servers
lexia restart         # Restart servers
lexia update          # Update Lexia packages
lexia config          # Configure Lexia settings
lexia deploy          # Deploy to production
```

### Language Support

```bash
lexia kickstart node  # Node.js/TypeScript agent
lexia kickstart go    # Go-based agent
lexia kickstart rust  # Rust-based agent
```

---

**Made with ❤️ by the Lexia Team**

Star ⭐ this repo if you find it helpful!
