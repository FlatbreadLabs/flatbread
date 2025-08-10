import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  detectPackageManager,
  getInstallCommand,
  getRunCommand,
  generateInstallCommand,
} from '../packageManager.js';

// Mock find-up
vi.mock('find-up', () => ({
  findUpSync: vi.fn(),
}));

describe('Package Manager Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect npm when package-lock.json is found', async () => {
    const { findUpSync } = await import('find-up');
    vi.mocked(findUpSync).mockReturnValue('/project/package-lock.json');

    const config = detectPackageManager();
    expect(config.installCommand).toBe('npm install');
    expect(config.runCommand).toBe('npm run');
  });

  it('should detect pnpm when pnpm-lock.yaml is found', async () => {
    const { findUpSync } = await import('find-up');
    vi.mocked(findUpSync).mockReturnValue('/project/pnpm-lock.yaml');

    const config = detectPackageManager();
    expect(config.installCommand).toBe('pnpm i');
    expect(config.runCommand).toBe('pnpm');
  });

  it('should detect yarn when yarn.lock is found', async () => {
    const { findUpSync } = await import('find-up');
    vi.mocked(findUpSync).mockReturnValue('/project/yarn.lock');

    const config = detectPackageManager();
    expect(config.installCommand).toBe('yarn add');
    expect(config.runCommand).toBe('yarn');
  });

  it('should fall back to npm when no lock file is found', async () => {
    const { findUpSync } = await import('find-up');
    vi.mocked(findUpSync).mockReturnValue(undefined);

    const config = detectPackageManager();
    expect(config.installCommand).toBe('npm install');
    expect(config.runCommand).toBe('npm run');
  });

  it('should generate correct install commands', async () => {
    const { findUpSync } = await import('find-up');
    vi.mocked(findUpSync).mockReturnValue('/project/pnpm-lock.yaml');

    const command = generateInstallCommand(['typescript', '@types/node']);
    expect(command).toBe('pnpm i typescript @types/node');
  });

  it('should get install command directly', async () => {
    const { findUpSync } = await import('find-up');
    vi.mocked(findUpSync).mockReturnValue('/project/yarn.lock');

    const installCmd = getInstallCommand();
    expect(installCmd).toBe('yarn add');
  });

  it('should get run command directly', async () => {
    const { findUpSync } = await import('find-up');
    vi.mocked(findUpSync).mockReturnValue('/project/yarn.lock');

    const runCmd = getRunCommand();
    expect(runCmd).toBe('yarn');
  });
});
