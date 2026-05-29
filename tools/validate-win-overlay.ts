import { validateCleopatraWinOverlayProof } from './local/pipeline/cleopatraWinOverlayValidate.ts';
import { printReport } from './local/pipeline/pipelineTypes.ts';

const report = validateCleopatraWinOverlayProof(process.cwd());
printReport(report);
process.exit(report.passed ? 0 : 1);
