import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const pluginRoot = path.join(repoRoot, 'plugins', 'openclaw-clawguard');
const entryPoint = path.join(pluginRoot, 'src', 'index.ts');
const outdir = path.join(pluginRoot, 'dist');

await fs.mkdir(outdir, { recursive: true });

await build({
  entryPoints: [entryPoint],
  outfile: path.join(outdir, 'index.js'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: ['node20'],
  minify: true,
  sourcemap: false,
  logLevel: 'silent',
  legalComments: 'none',
  alias: {
    clawguard: path.join(repoRoot, 'src', 'index.ts'),
  },
});
