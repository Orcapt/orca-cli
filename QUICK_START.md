# @orca/cli - Quick Start Guide

Get your Orca AI agent running in less than 2 minutes! ⚡

## Installation

Choose one of these methods:

### Method 1: Use directly with npx (No installation)
```bash
npx @orca/cli kickstart python
# or
npx @orca/cli kickstart node
```

### Method 2: Install globally
```bash
npm install -g @orca/cli
orca kickstart python
# or
orca kickstart node
```

### Method 3: Install from source
```bash
cd orca-cli
npm install
npm link
orca kickstart python  # or node
```

## Basic Usage

### 1. Start a New Agent

**Python Agent:**
```bash
orca kickstart python
```

**Node.js Agent:**
```bash
orca kickstart node
```

This command will:
- Check if you have Python, Git, and Node.js installed
- Create a `orca-kickstart` directory
- Clone the starter kit
- Set up everything automatically
- Start both backend and frontend servers

**Done!** Open http://localhost:3000 in your browser 🎉

### 2. Other Languages

**Node.js (Available Now):**
```bash
orca kickstart node
```

**Go (Coming Soon):**
```bash
orca kickstart go
```

### 3. Custom Setup

**Python:**
```bash
# Custom directory name
orca kickstart python --directory my-ai-agent

# Custom ports
orca kickstart python --port 8080 --agent-port 8000

# Setup without auto-start
orca kickstart python --no-start
```

**Node.js:**
```bash
# Custom directory name
orca kickstart node --directory my-node-agent

# Custom ports  
orca kickstart node --port 8080 --agent-port 8000

# Setup without auto-start
orca kickstart node --no-start
```

### 4. Stopping Servers

Press `Ctrl+C` in the terminal to stop both servers gracefully.

## What You Get

```
orca-kickstart/
├── main.py                    # Main agent logic
├── requirements.txt           # Python dependencies
├── memory/                    # Conversation management
│   └── conversation_manager.py
├── agent_utils.py            # Utility functions
├── function_handler.py       # Function calling (DALL-E, etc.)
├── orca_env/                # Python virtual environment
└── uploads/                  # File uploads directory
```

## Next Steps

1. **Configure your OpenAI API key** in the Orca UI (Admin mode → Agents)
2. **Customize the agent** by editing `main.py`
3. **Add new functions** in `function_handler.py`
4. **Test your agent** at http://localhost:3000

## Troubleshooting

### Prerequisites Missing?

**Python:**
```bash
# macOS
brew install python3

# Windows
# Download from https://www.python.org/downloads/

# Linux
sudo apt install python3 python3-pip
```

**Git:**
```bash
# macOS
brew install git

# Windows
# Download from https://git-scm.com/downloads

# Linux
sudo apt install git
```

### Port Already in Use?

```bash
# Use different ports
orca kickstart python --port 4000 --agent-port 5000
```

### Directory Already Exists?

```bash
# Remove it first
rm -rf orca-kickstart

# Or use a different name
orca kickstart python --directory my-new-agent
```

## Manual Control

If you used `--no-start`, you can manually start the servers:

```bash
cd orca-kickstart

# Activate virtual environment
source orca_env/bin/activate    # macOS/Linux
orca_env\Scripts\activate       # Windows

# Start backend
python main.py --dev

# In another terminal, start frontend
npx -y @orca/ui orca --port=3000 --agent-port=5001
```

## Example Session

```bash
$ orca kickstart python

============================================================
🚀 Orca Kickstart - Python
============================================================

✓ Python found: python3
✓ Git found
✓ Node.js/npm found
✓ npx found

► Creating directory: orca-kickstart
✓ Created directory: /Users/you/orca-kickstart

✓ Repository cloned successfully
✓ Virtual environment created
✓ Dependencies installed

============================================================
✓ Setup completed successfully!
============================================================

? Do you want to start the backend and frontend servers now? Yes

✓ Backend started (PID: 12345)
✓ Frontend started (PID: 12346)

============================================================
🎉 Orca is running!
============================================================

Frontend: http://localhost:3000
Backend:  http://localhost:5001

⚠ Press Ctrl+C to stop both servers
```

## Need Help?

- 📚 [Full Documentation](README.md)
- 🐛 [Report Issues](https://github.com/Orcapt/orca-cli/issues)
- 💬 [GitHub Discussions](https://github.com/Orcapt/orca-cli/discussions)

---

**Ready to build amazing AI agents? Let's go! 🚀**

