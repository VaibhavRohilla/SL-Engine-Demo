import { runAssets } from './local/commands/runAssets.ts';

async function main(): Promise<void> {
  const writeReports = process.argv.includes('--json');
  const { success } = runAssets({
    rootDir: process.cwd(),
    writeReports,
  });
  if (!success) process.exit(1);
}

await main();
