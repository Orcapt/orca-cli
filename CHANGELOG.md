# Changelog

All notable changes to the Lexia CLI will be documented in this file.

## [0.4.1] - 2025-11-14

### Fixed
- Fixed `lexia ui start` command to work with @lexia/ui v1.1.0+
- UI command now properly serves the dist folder using http-server instead of trying to run as executable
- Updated messaging to accurately describe UI serving mechanism
- Resolves "could not determine executable to run" error

### Technical
- @lexia/ui v1.1.0 removed the CLI executable and became a React component library
- CLI now detects the installed @lexia/ui dist folder and serves it directly
- Uses npx http-server to serve the pre-built UI

## [0.2.1] - 2025-10-12

### Fixed
- Fixed Node.js agent startup by adding `--dev` flag to launch command
- Fixed `@lexia/sdk` dependency to use npm package (`^1.0.0`) instead of local file reference
- Removed automatic memory module creation (now included in GitHub repo)
- Node.js agents now start correctly in development mode

### Changed
- Memory module is now tracked in the GitHub repo with correct method names
- CLI no longer auto-creates memory files, uses files from cloned repo instead

## [0.2.0] - 2025-10-12

### Added
- 🎉 **Node.js support!** - `lexia kickstart node` command for Node.js-based agents
- Node.js starter kit integration with Express + OpenAI
- Automatic npm dependency installation for Node.js projects
- Support for cloning from `lexia-starter-kit-node-v1` repository

### Changed
- Updated help text to show Node.js as available (not coming soon)
- Improved command examples in help output
- Changed "Backend" to "Agent" throughout the CLI
- Changed "Frontend" to "Lexia-UI" throughout the CLI

### Technical
- Added `src/commands/kickstart-node.js` for Node.js project setup
- Node.js projects don't require Python or virtual environments
- Streamlined dependency installation for Node.js (just `npm install`)

## [0.1.2] - 2025-10-12

### Fixed
- Fixed variable shadowing bug causing "Cannot access 'process' before initialization" error
- Removed deprecation warning by changing `shell: true` to `shell: false` in spawn calls
- Removed circular dependency from package.json

### Changed
- Renamed internal process variables to `backendProcess` and `frontendProcess` for clarity
- Improved error handling in process spawning

## [0.1.1] - 2025-10-12

### Fixed
- Initial bug fixes and improvements

## [0.1.0] - 2025-10-11

### Added
- Initial release of `@lexia/cli`
- Multi-language support architecture with subcommands
- `lexia kickstart python` command for Python-based Lexia agents
- Cross-platform support (Windows, Linux, macOS)
- Beautiful CLI with colored output and progress spinners
- Automatic prerequisite checking (Python, Git, Node.js)
- Virtual environment setup and dependency installation
- Automatic server startup (backend + frontend)
- Process management with graceful shutdown
- Interactive prompts for user-friendly experience

### Coming Soon
- `lexia kickstart node` - Node.js/TypeScript starter kit
- `lexia kickstart go` - Go-based starter kit
- `lexia status` - Check running instances
- `lexia stop` - Stop running servers
- `lexia update` - Update Lexia packages

### Technical Details
- Package name: `@lexia/cli` (scoped package)
- Dependencies: commander, chalk, ora, inquirer, simple-git, cross-spawn
- Node.js 14+ required
- Automatic Python version detection (python3 or python)
- Cross-platform path handling

### Breaking Changes
- Changed from `lexia-cli` to `@lexia/cli` (scoped package)
- Changed from `lexia kickstart` to `lexia kickstart <language>` to support multiple languages
- Now requires explicit language selection (e.g., `lexia kickstart python`)

### Migration Guide
If you were using the beta version:

**Before:**
```bash
npm install -g lexia-cli
lexia kickstart
```

**Now:**
```bash
npm install -g @lexia/cli
lexia kickstart python
```

