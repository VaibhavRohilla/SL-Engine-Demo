/**
 * Development Server — dist/ layout matches production.
 */

import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import { watch } from 'fs';
import { loadBuildConfig } from '../config/buildConfigLoader.ts';
import { STARTER_CONVENTIONS } from '../constants/conventions.ts';

export interface RunDevOptions {
  rootDir?: string;
}

function debounce(fn: () => void, ms: number): () => void {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return () => {
    if (timeout !== undefined) clearTimeout(timeout);
    timeout = setTimeout(() => {
      timeout = undefined;
      fn();
    }, ms);
  };
}

function copyDirFiltered(src: string, dst: string): void {
  fs.mkdirSync(dst, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, ent.name);
    const dstPath = path.join(dst, ent.name);
    if (ent.name === '__MACOSX' || ent.name === '.DS_Store' || ent.name === 'Thumbs.db') continue;
    if (ent.isDirectory()) {
      copyDirFiltered(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

function getLanIPv4Addresses(): string[] {
  const nets = os.networkInterfaces();
  const out: string[] = [];
  if (!nets) return out;

  for (const infos of Object.values(nets)) {
    if (!infos) continue;
    for (const netInfo of infos) {
      const family = netInfo.family as string | number;
      const isV4 = family === 'IPv4' || family === 4;
      if (!isV4 || netInfo.internal) continue;
      out.push(netInfo.address);
    }
  }

  return [...new Set(out)].sort();
}

function isPortAvailable(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    try {
      server.listen(port, host === '::' ? '::' : host);
    } catch {
      resolve(false);
    }
  });
}

async function findFirstFreePort(startPort: number, host: string, maxAttempts = 100): Promise<number> {
  let port = startPort;
  for (let i = 0; i < maxAttempts; i++) {
    if (port > 65535) break;
    if (await isPortAvailable(port, host)) return port;
    console.log(`  Port ${port} is already in use, trying ${port + 1}...`);
    port += 1;
  }
  throw new Error(`No free port found after ${maxAttempts} attempts (from ${startPort})`);
}

function browserHost(host: string): string {
  if (host === '0.0.0.0' || host === '::' || host === '') return 'localhost';
  return host;
}

function buildLiveReloadSnippet(allowLan: boolean): string {
  const allowLanJs = allowLan ? 'true' : 'false';
  return `
<script>
(function(){if(window.__SL_DEV_LR__)return;window.__SL_DEV_LR__=1;
var allowLan=${allowLanJs};
if(!allowLan){
  var h=location.hostname;
  if(h!=="localhost"&&h!=="127.0.0.1"&&h!=="::1"&&h!=="[::1]")return;
}
var last=null;
var pollMs=(typeof matchMedia!=="undefined"&&matchMedia("(pointer:coarse)").matches)?4000:2000;
function check(){
  if(typeof document!=="undefined"&&document.hidden)return;
  fetch("/main.js?t="+Date.now(),{cache:"no-store",headers:{"Cache-Control":"no-cache"}})
    .then(function(r){return r.text();})
    .then(function(t){
      var m=t.match(/\\/\\* BUILD_TIMESTAMP:(\\d+) \\*\\//);
      if(!m)return;
      var cur=parseInt(m[1],10);
      if(!isFinite(cur))return;
      if(last===null){last=cur;return;}
      if(cur!==last)location.reload();
    }).catch(function(){});
}
setTimeout(check,1500);
setInterval(check,pollMs);
})();
</script>`;
}

export async function runDev(options: RunDevOptions = {}): Promise<{ host: string; port: number }> {
  const { config: buildConfig, rootDir: projectRoot } = loadBuildConfig(options.rootDir);

  const entry = STARTER_CONVENTIONS.buildEntry;
  const outDirName = STARTER_CONVENTIONS.buildOutDir;
  const distDir = path.join(projectRoot, outDirName);
  const outFile = path.join(distDir, 'main.js');

  const requestedPort = (() => {
    const num = Number(process.env.PORT);
    if (Number.isFinite(num) && num > 0) return Math.floor(num);
    return STARTER_CONVENTIONS.devPort;
  })();

  const listenHost = process.env.DEV_HOST?.trim() || STARTER_CONVENTIONS.devHost;
  const liveReloadEnabled = process.env.DEV_LIVE_RELOAD !== '0';
  const liveReloadAllowLan = process.env.DEV_LIVE_RELOAD_LAN === '1';
  const debounceMs = (() => {
    const num = Number(process.env.DEV_DEBOUNCE_MS);
    return Number.isFinite(num) && num >= 0 ? Math.floor(num) : 250;
  })();

  const timestampRe = /\/\* BUILD_TIMESTAMP:(\d+) \*\//;

  const stampBundle = (): void => {
    try {
      if (!fs.existsSync(outFile)) return;
      let code = fs.readFileSync(outFile, 'utf-8');
      const stamp = `/* BUILD_TIMESTAMP:${Date.now()} */`;
      code = code.replace(/\/\* BUILD_TIMESTAMP:\d+ \*\//, stamp);
      if (!timestampRe.test(code)) {
        code = `${stamp}\n${code}`;
      }
      fs.writeFileSync(outFile, code, 'utf-8');
    } catch {
      // ignore
    }
  };

  const timestampPlugin: esbuild.Plugin = {
    name: 'sl-starter-dev-build-timestamp',
    setup(build) {
      build.onEnd((result) => {
        if (result.errors.length > 0) return;
        stampBundle();
      });
    },
  };

  const prepareDistLayout = (): void => {
    fs.mkdirSync(distDir, { recursive: true });
    for (const file of ['main.js', 'main.js.map']) {
      const outputPath = path.join(distDir, file);
      try {
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      } catch {
        // ignore
      }
    }

    try {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) fs.unlinkSync(indexPath);
    } catch {
      // ignore
    }

    const assetsDst = path.join(distDir, 'assets');
    if (fs.existsSync(assetsDst)) {
      fs.rmSync(assetsDst, { recursive: true });
    }
  };

  const writeIndexHtmlToDist = (): void => {
    const htmlSrc = path.join(projectRoot, 'src', 'index.html');
    const htmlDst = path.join(distDir, 'index.html');
    if (!fs.existsSync(htmlSrc)) return;

    let html = fs.readFileSync(htmlSrc, 'utf-8');
    html = html.replace(/\.\.\/dist\/main\.js/g, './main.js');
    html = html.replace(/\.\/main\.ts/g, './main.js');
    if (liveReloadEnabled) {
      html = html.replace(/<\/body>/i, `${buildLiveReloadSnippet(liveReloadAllowLan)}\n</body>`);
    }
    fs.writeFileSync(htmlDst, html, 'utf-8');
  };

  const syncAssetsToDist = (): void => {
    const assetsSrc = path.join(projectRoot, 'assets');
    const assetsDst = path.join(distDir, 'assets');
    if (!fs.existsSync(assetsSrc)) return;
    if (fs.existsSync(assetsDst)) {
      fs.rmSync(assetsDst, { recursive: true });
    }
    copyDirFiltered(assetsSrc, assetsDst);
  };

  console.log('\n  Preparing dist/ (dev)...\n');

  const manifestPath = path.join(projectRoot, 'assets', 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.log('  ⚠ No assets/manifest.json — run: pnpm assets\n');
  }

  prepareDistLayout();
  writeIndexHtmlToDist();
  syncAssetsToDist();

  const context = await esbuild.context({
    entryPoints: [path.join(projectRoot, entry)],
    bundle: true,
    platform: 'browser',
    format: 'esm',
    sourcemap: true,
    outfile: outFile,
    external: [],
    loader: { '.ts': 'ts' },
    logLevel: 'warning',
    define: {
      'process.env.NODE_ENV': '"development"',
    },
    plugins: [timestampPlugin],
  });

  await context.rebuild();
  await context.watch();

  const debouncedSyncAssets = debounce(() => {
    syncAssetsToDist();
    console.log('  [assets] synced to dist/assets/');
  }, debounceMs);

  const debouncedWriteHtml = debounce(() => {
    writeIndexHtmlToDist();
    console.log('  [html] dist/index.html updated');
  }, debounceMs);

  const assetsSrc = path.join(projectRoot, 'assets');
  if (fs.existsSync(assetsSrc)) {
    console.log(`  Watching assets/ (debounce ${debounceMs}ms)\n`);
    watch(assetsSrc, { recursive: true }, (_event, filename) => {
      if (filename) debouncedSyncAssets();
    });
  }

  const htmlSrc = path.join(projectRoot, 'src', 'index.html');
  if (fs.existsSync(htmlSrc)) {
    watch(htmlSrc, () => debouncedWriteHtml());
  }

  const chosenPort = await findFirstFreePort(requestedPort, listenHost);
  if (chosenPort !== requestedPort) {
    console.log(`\n  Port ${requestedPort} was already in use — serving on ${chosenPort} instead.\n`);
  }

  const served = await context.serve({
    servedir: distDir,
    port: chosenPort,
    host: listenHost,
  });

  const browse = `http://${browserHost(served.host)}:${served.port}`;
  const lanIps = getLanIPv4Addresses();
  const onLan =
    listenHost === '0.0.0.0' || listenHost === '::'
      ? lanIps.length > 0
        ? `\n  LAN:       ${lanIps.map((ip) => `http://${ip}:${served.port}/`).join('  ')}  (same Wi-Fi)`
        : '\n  LAN:       (no non-local IPv4 found — use localhost or check interfaces)'
      : '';

  const liveReloadLine = liveReloadEnabled
    ? liveReloadAllowLan
      ? '\n  Reload:    auto on rebuild (incl. LAN — DEV_LIVE_RELOAD_LAN=1)'
      : '\n  Reload:    auto on localhost only (LAN/iPhone: no poll; use DEV_LIVE_RELOAD_LAN=1 or DEV_LIVE_RELOAD=0)'
    : '\n  Reload:    off (DEV_LIVE_RELOAD=0)';

  console.log(`\n  Open:      ${browse}/`);
  console.log(`  Bundle:    ${browse}/main.js${liveReloadLine}${onLan}`);
  console.log(`  TS entry:  ${entry}`);
  console.log(`  Game:      ${buildConfig.game?.name ?? 'unknown'}\n`);

  return { host: served.host, port: served.port };
}
