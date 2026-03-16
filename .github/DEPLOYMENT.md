# 🚀 Deployment Guide for @orca-pt/cli

This workflow automatically publishes the CLI package to npm when a release is created.

## 📋 Prerequisites

### NPM Publishing

1. **Create NPM Token**:

   - Go to [npmjs.com](https://www.npmjs.com/) and log in
   - Go to `Access Tokens` → `Generate New Token`
   - Select `Automation` token type
   - Copy the token

2. **Configure Secret**: In the repository settings:
   - Go to `Settings` → `Secrets and variables` → `Actions`
   - Add a new secret named `NPM_TOKEN`
   - Paste your NPM token as the value

## 🔧 How It Works

The workflow automatically runs when:

- A new release is published (tagged version)
- Manual trigger via `workflow_dispatch` with version input

## 📦 Published Package

The workflow publishes the following package:

- **Name**: `@orca-pt/cli`
- **Files**: `bin/`, `src/`, `orca-kickstart/`, `README.md`, `LICENSE`, `QUICK_START.md`
- **CLI Command**: `orcapt`

## 📤 Publishing to NPM

To publish a new version to NPM:

1. **Update Version** (if needed):

   - Update the version in `package.json` if you want to change it before release

2. **Create a Release**:

   - Go to `Releases` → `Create a new release`
   - Create a new tag (e.g., `v0.4.2`)
   - Add release notes
   - Click `Publish release`

3. **Automatic Publishing**:

   - The workflow will automatically trigger
   - It will update the package name to `@orca-pt/cli`
   - It will use the version from the release tag
   - Publish to NPM

4. **Verify Publication**:
   - Check npm: `https://www.npmjs.com/package/@orca-pt/cli`
   - Install and test: `npm install -g @orca-pt/cli`

## 🔍 Troubleshooting

If NPM publish fails:

1. Verify that the `NPM_TOKEN` secret is correctly configured
2. Ensure you have publish access to the `@orca-pt` scope on npm
3. Check that the version in the release tag is unique and not already published
4. Review the workflow logs in the `Actions` tab
5. Make sure the package name `@orca-pt/cli` is available on npm

## 📝 Manual Publishing

You can also trigger the workflow manually:

1. Go to `Actions` → `Publish to NPM`
2. Click `Run workflow`
3. Enter the version number (e.g., `0.4.2`)
4. Click `Run workflow`
