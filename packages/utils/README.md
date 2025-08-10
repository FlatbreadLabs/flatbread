# @flatbread/utils 🛠️

> Shared utilities for Flatbread packages

## 💾 Install

```bash
pnpm add @flatbread/utils
```

## 🎯 Overview

This package provides shared utility functions used across the Flatbread ecosystem. It includes package manager detection, command generation, and other common functionality.

## 📦 Package Manager Detection

Automatically detect which package manager is being used in a project:

```ts
import {
  detectPackageManager,
  getInstallCommand,
  generateInstallCommand,
} from '@flatbread/utils';

// Detect package manager configuration
const pkgManager = detectPackageManager();
console.log(pkgManager.installCommand); // "npm install", "pnpm add", "yarn add", etc.

// Get just the install command
const installCmd = getInstallCommand();
console.log(installCmd); // "npm install"

// Generate a complete install command
const fullCommand = generateInstallCommand(['typescript', 'eslint']);
console.log(fullCommand); // "npm install typescript eslint"
```

### Supported Package Managers

The utility automatically detects package managers based on lock files:

- **npm** (`package-lock.json`) → `npm install`
- **pnpm** (`pnpm-lock.yaml`) → `pnpm add`
- **yarn** (`yarn.lock`) → `yarn add`
- **bun** (`bun.lockb`) → `bun add`

### API

#### `detectPackageManager(cwd?: string)`

Returns the full package manager configuration:

```ts
interface PackageManagerConfig {
  runCommand: string; // "npm run", "pnpm", etc.
  installCommand: string; // "npm install", "pnpm add", etc.
  lockFile: string; // "package-lock.json", etc.
}
```

#### `getInstallCommand(cwd?: string)`

Returns just the install command string.

#### `getRunCommand(cwd?: string)`

Returns just the run command string.

#### `generateInstallCommand(packages: string[], cwd?: string)`

Generates a complete install command for the given packages.

## 🤝 Contributing

We welcome contributions! Please see the main [Flatbread contributing guide](../../CONTRIBUTING.md) for details.
