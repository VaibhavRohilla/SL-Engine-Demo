import { runBuild } from './local/commands/runBuild.ts';

await runBuild({ rootDir: process.cwd() });
