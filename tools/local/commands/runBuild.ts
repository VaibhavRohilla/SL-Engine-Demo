/**
 * Production Build — esbuild bundle for consumer project.
 */

import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import { loadBuildConfig } from '../config/buildConfigLoader.ts';
import { STARTER_CONVENTIONS } from '../constants/conventions.ts';

export interface RunBuildOptions {
  rootDir?: string;
}

function copyDir(src: string, dst: string): void {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.name === '__MACOSX' || entry.name === '.DS_Store' || entry.name === 'Thumbs.db') continue;
    if (entry.isDirectory()) {
      copyDir(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

export async function runBuild(options: RunBuildOptions = {}): Promise<void> {
  const { config, rootDir: projectRoot } = loadBuildConfig(options.rootDir);

  const entry = STARTER_CONVENTIONS.buildEntry;
  const outDir = STARTER_CONVENTIONS.buildOutDir;

  await esbuild.build({
    entryPoints: [path.join(projectRoot, entry)],
    bundle: true,
    platform: 'browser',
    format: 'esm',
    sourcemap: true,
    minify: true,
    outfile: path.join(projectRoot, outDir, 'main.js'),
    external: [],
    loader: { '.ts': 'ts' },
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  });

  const htmlSrc = path.join(projectRoot, 'src', 'index.html');
  const htmlDst = path.join(projectRoot, outDir, 'index.html');
  if (fs.existsSync(htmlSrc)) {
    let html = fs.readFileSync(htmlSrc, 'utf-8');
    html = html.replace(/\.\.\/dist\/main\.js/g, './main.js');
    html = html.replace(/\.\/main\.ts/g, './main.js');
    fs.mkdirSync(path.dirname(htmlDst), { recursive: true });
    fs.writeFileSync(htmlDst, html, 'utf-8');
  }

  const assetsDir = path.join(projectRoot, 'assets');
  const assetsOutDir = path.join(projectRoot, outDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    copyDir(assetsDir, assetsOutDir);
  }

  console.log(`\n  Build complete: ${outDir}/`);
  console.log(`  Game: ${config.game?.name ?? 'unknown'} v${config.game?.version ?? '?'}\n`);
}
