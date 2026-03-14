import { execSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve('.');
const installDemoPluginRelativeRoot = path.join('plugins', 'openclaw-clawguard');
const installDemoPluginRoot = path.join(repoRoot, installDemoPluginRelativeRoot);

type InstallDemoPackageManifest = {
  name: string;
  version: string;
  files: string[];
  openclaw: {
    install: {
      localPath: string;
      optionalMethod: string;
      published: boolean;
    };
  };
};

type PackResult = {
  name: string;
  version: string;
  filename: string;
  files: Array<{
    path: string;
  }>;
};

function runInstallDemoPack(): PackResult {
  const stdout = execSync(`pnpm --dir "${installDemoPluginRelativeRoot}" pack --json`, {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  const objectStart = stdout.lastIndexOf('\n{');
  const jsonPayload = (objectStart >= 0 ? stdout.slice(objectStart + 1) : stdout).trim();

  return JSON.parse(jsonPayload) as PackResult;
}

describe('openclaw clawguard install-demo tarball surface', () => {
  it('keeps the local tarball flow documented and the packed surface minimal', () => {
    const packageManifest = JSON.parse(
      readFileSync(path.join(installDemoPluginRoot, 'package.json'), 'utf8'),
    ) as InstallDemoPackageManifest;
    const readme = readFileSync(path.join(installDemoPluginRoot, 'README.md'), 'utf8');

    expect(packageManifest.openclaw.install).toMatchObject({
      localPath: 'plugins/openclaw-clawguard',
      optionalMethod: 'local-tarball-only',
      published: false,
    });
    expect(packageManifest.files).toEqual(
      expect.arrayContaining(['dist', 'openclaw.plugin.json', 'README.md']),
    );
    expect(readme).toContain('Optional method: local tarball only');
    expect(readme).toContain('pnpm --dir plugins\\openclaw-clawguard pack');
    expect(readme).toContain(
      'openclaw plugins install .\\plugins\\openclaw-clawguard\\<generated-tarball>.tgz',
    );

    const packResult = runInstallDemoPack();
    const packedPaths = packResult.files.map((entry) => entry.path).sort();
    const expectedTarballPath = path.join(
      installDemoPluginRoot,
      `clawguard-openclaw-clawguard-${packageManifest.version}.tgz`,
    );
    const resolvedTarballPath = path.resolve(installDemoPluginRoot, packResult.filename);

    try {
      expect(packResult.name).toBe(packageManifest.name);
      expect(packResult.version).toBe(packageManifest.version);
      expect(resolvedTarballPath).toBe(expectedTarballPath);
      expect(packedPaths).toEqual(
        expect.arrayContaining(['README.md', 'openclaw.plugin.json', 'package.json']),
      );
      expect(packedPaths.some((entry) => entry === 'dist' || entry.startsWith('dist/'))).toBe(true);
      expect(packedPaths).toContain('dist/index.js');
    } finally {
      rmSync(resolvedTarballPath, { force: true });
    }
  });
});
