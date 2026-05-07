import { runDoctor } from './local/commands/runDoctor.ts';

async function main(): Promise<void> {
  const writeJson = process.argv.includes('--json');
  const report = await runDoctor({
    rootDir: process.cwd(),
    writeJson,
  });
  if (!report.passed) process.exit(1);
}

await main();
