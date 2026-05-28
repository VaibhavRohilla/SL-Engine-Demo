/**
 * Optional production SFX gate — fails while starter placeholder WAVs remain.
 * Run: pnpm validate:production-sfx
 * Same gate as doctor step 9 and `pnpm assets` (sfx-production:validate).
 */

import { validateCleopatraProductionSfx } from './local/pipeline/sfxProductionValidate.ts';
import { printReport } from './local/pipeline/pipelineTypes.ts';

function main(): void {
  const report = validateCleopatraProductionSfx();
  printReport(report);
  if (!report.passed) {
    console.error('\nCleopatra production SFX validation: FAIL');
    console.error(
      '  Blocker: required SFX are missing, empty, or still starter placeholder bytes.',
    );
    console.error('  Handoff: docs/CLEOPATRA_PRODUCTION_SFX_HANDOFF.md');
    console.error('  Checklist: docs/CLEOPATRA_PRODUCTION_SFX_REPLACEMENT_CHECKLIST.md');
    console.error('  After replacing WAVs: pnpm assets && pnpm validate:production-sfx && pnpm doctor');
    process.exit(1);
  }
  console.log('\nCleopatra production SFX validation: PASS');
}

main();
