#!/usr/bin/env node
/**
 * Run repo TypeScript tooling without tsx loader deprecation noise on Node 22+.
 * Node 18–21: tsx with DEP0205 warning suppressed.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entry = process.argv[2];

if (!entry) {
  console.error('Usage: node tools/run-ts.mjs <script.ts> [args...]');
  process.exit(1);
}

const scriptPath = path.isAbsolute(entry) ? entry : path.join(repoRoot, entry);
const extraArgs = process.argv.slice(3);
const nodeMajor = Number(process.versions.node.split('.')[0]);

const nodeArgs =
  nodeMajor >= 22
    ? ['--experimental-strip-types', scriptPath, ...extraArgs]
    : ['--disable-warning=DEP0205', '--import', 'tsx/esm', scriptPath, ...extraArgs];

const result = spawnSync(process.execPath, nodeArgs, {
  cwd: repoRoot,
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
