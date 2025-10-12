# Changelog

All notable changes to the Lexia CLI will be documented in this file.

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

