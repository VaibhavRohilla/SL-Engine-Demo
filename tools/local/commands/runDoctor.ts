/**
 * Starter Doctor — comprehensive project health check.
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadBuildConfig } from '../config/buildConfigLoader.ts';
import {
  type PipelineIssue,
  type PipelineReport,
  IssueCategory,
  IssueCodes,
  createReport,
  printReport,
} from '../pipeline/pipelineTypes.ts';
import { validateManifest } from '../pipeline/manifestValidate.ts';
import { validateReferencedKeys } from '../pipeline/referencedKeysValidate.ts';
import { validateAssets } from '../pipeline/assetsValidate.ts';
import { validateSpine } from '../pipeline/spineValidate.ts';
import { validateLoading } from '../pipeline/loadingValidate.ts';
import { validateTemplateGameConfig } from '../pipeline/templateConfigValidate.ts';
import { validateStarterHudConfig } from '../pipeline/hudConfigValidate.ts';
import { validateCleopatraProductionSfx } from '../pipeline/sfxProductionValidate.ts';
import { resolveProjectRoot } from '../utils/paths.ts';
import { composeEngineGameDefinition } from '../../../src/config/composeEngineGameDefinition.ts';
import { audioProfile } from '../../../src/config/audioConfig.ts';
import { bootConfig } from '../../../src/config/bootConfig.ts';
import { featureConfig } from '../../../src/config/featureConfig.ts';
import { slotConfig } from '../../../src/config/slotConfig.ts';
import { templateGameConfig } from '../../../src/config/templateGameConfig.ts';
import { starterRuntimeBuildConfig } from '../../../src/config/buildConfigRuntime.ts';

export interface RunDoctorOptions {
  rootDir?: string;
  writeJson?: boolean;
  logger?: Pick<Console, 'log'>;
}

function checkProjectStructure(projectRoot: string, issues: PipelineIssue[]): void {
  const requiredDirs = ['src', 'src/config', 'src/game', 'assets', 'tools'];
  for (const dir of requiredDirs) {
    if (!fs.existsSync(path.join(projectRoot, dir))) {
      issues.push({
        code: IssueCodes.PIPELINE_DIR_MISSING,
        category: IssueCategory.PIPELINE,
        severity: 'error',
        message: `Required directory missing: ${dir}/`,
        file: dir,
      });
    }
  }
}

function checkSdkInstalled(projectRoot: string, issues: PipelineIssue[]): void {
  const sdkPath = path.join(projectRoot, 'node_modules', '@fnx', 'sl-engine');
  if (!fs.existsSync(sdkPath)) {
    issues.push({
      code: IssueCodes.PIPELINE_SDK_MISSING,
      category: IssueCategory.PIPELINE,
      severity: 'error',
      message: 'SDK package not installed — run pnpm install',
    });
    return;
  }

  const pkgPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(pkgPath)) return;

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { dependencies?: Record<string, string> };
  const dependency = pkg.dependencies?.['@fnx/sl-engine'];
  const vendoredSpec = 'file:./vendor/sl-engine';
  const siblingEngineSpec = 'file:../SL-Engine';
  const allowedSdkSpecs = new Set([vendoredSpec, siblingEngineSpec]);
  if (!dependency) {
    issues.push({
      code: IssueCodes.PIPELINE_SDK_MISSING,
      category: IssueCategory.PIPELINE,
      severity: 'error',
      message: 'Missing dependencies.@fnx/sl-engine — add `file:../SL-Engine` (sibling dev) or `file:./vendor/sl-engine` (vendored) and run pnpm install',
    });
    return;
  }
  if (!allowedSdkSpecs.has(dependency)) {
    issues.push({
      code: IssueCodes.PIPELINE_SDK_NOT_VENDORED,
      category: IssueCategory.PIPELINE,
      severity: 'error',
      message: `dependencies.@fnx/sl-engine must be "${vendoredSpec}" or "${siblingEngineSpec}" (found "${dependency}"). Use the vendored path for offline/starter parity; use the sibling path when developing against a local SL-Engine checkout.`,
      file: 'package.json',
    });
    return;
  }

  const relative = dependency.slice(5);
  const absolute = path.resolve(projectRoot, relative);
  if (!fs.existsSync(absolute)) {
    issues.push({
      code: IssueCodes.PIPELINE_SDK_MISSING,
      category: IssueCategory.PIPELINE,
      severity: 'error',
      message: `SDK path missing: ${relative}`,
      file: relative,
    });
  }
}

function checkEntryPoints(projectRoot: string, issues: PipelineIssue[]): void {
  if (!fs.existsSync(path.join(projectRoot, 'src/main.ts'))) {
    issues.push({
      code: IssueCodes.PIPELINE_ENTRY_MISSING,
      category: IssueCategory.PIPELINE,
      severity: 'error',
      message: 'Entry point missing: src/main.ts',
      file: 'src/main.ts',
    });
  }

  if (!fs.existsSync(path.join(projectRoot, 'src/index.html'))) {
    issues.push({
      code: IssueCodes.PIPELINE_HTML_MISSING,
      category: IssueCategory.PIPELINE,
      severity: 'error',
      message: 'HTML entry missing: src/index.html',
      file: 'src/index.html',
    });
  }
}

function checkConfigFiles(projectRoot: string, issues: PipelineIssue[]): void {
  const configFiles = [
    'src/config/gameDefinition.ts',
    'src/config/buildConfigRuntime.ts',
    'src/config/slotConfig.ts',
    'src/config/starterTotalBetSteps.ts',
    'src/config/templateGameConfig.ts',
    'src/config/assetManifestIntent.ts',
    'src/config/templateHooks.ts',
    'src/config/bootConfig.ts',
    'src/config/featureConfig.ts',
    'src/config/audioConfig.ts',
    'src/config/hud/index.ts',
    'src/config/hud/hudConfig.ts',
    'src/config/hud/hudTheme.ts',
    'src/config/hud/paytableConfig.ts',
    'src/config/hud/betPanelConfig.ts',
    'src/config/hud/autoplayPanelConfig.ts',
    'src/config/hud/settingsPanelConfig.ts',
  ];

  for (const file of configFiles) {
    if (!fs.existsSync(path.join(projectRoot, file))) {
      issues.push({
        code: IssueCodes.PIPELINE_CONFIG_MISSING,
        category: IssueCategory.PIPELINE,
        severity: 'error',
        message: `Config file missing: ${file}`,
        file,
      });
    }
  }
}

function checkGameFiles(projectRoot: string, issues: PipelineIssue[]): void {
  const gameFiles = ['src/game/GameUI.ts', 'src/game/WinFormatter.ts'];
  for (const file of gameFiles) {
    if (!fs.existsSync(path.join(projectRoot, file))) {
      issues.push({
        code: IssueCodes.PIPELINE_GAME_FILE_MISSING,
        category: IssueCategory.PIPELINE,
        severity: 'warning',
        message: `Game implementation file missing: ${file}`,
        file,
      });
    }
  }
}

function stripComments(content: string): string {
  type State = 'normal' | 'double' | 'single' | 'block' | 'line';
  let state: State = 'normal';
  let out = '';
  const length = content.length;
  let index = 0;

  while (index < length) {
    const char = content[index];
    const next = content[index + 1];

    if (state === 'line') {
      if (char === '\n') {
        out += char;
        state = 'normal';
      }
      index++;
      continue;
    }

    if (state === 'block') {
      if (char === '*' && next === '/') {
        out += ' ';
        index += 2;
        state = 'normal';
      } else {
        index++;
      }
      continue;
    }

    if (state === 'double') {
      out += char;
      if (char === '\\') {
        index++;
        if (index < length) {
          out += content[index];
          index++;
        } else {
          index++;
        }
      } else if (char === '"') {
        state = 'normal';
        index++;
      } else {
        index++;
      }
      continue;
    }

    if (state === 'single') {
      out += char;
      if (char === '\\') {
        index++;
        if (index < length) {
          out += content[index];
          index++;
        } else {
          index++;
        }
      } else if (char === "'") {
        state = 'normal';
        index++;
      } else {
        index++;
      }
      continue;
    }

    if (char === '/' && next === '*') {
      out += ' ';
      index += 2;
      state = 'block';
      continue;
    }

    if (char === '/' && next === '/') {
      out += ' ';
      index += 2;
      state = 'line';
      continue;
    }

    if (char === '"') {
      out += char;
      index++;
      state = 'double';
      continue;
    }

    if (char === "'") {
      out += char;
      index++;
      state = 'single';
      continue;
    }

    out += char;
    index++;
  }

  return out;
}

function normalizedForScan(content: string): string {
  return stripComments(content).replace(/\s+/g, ' ');
}

function checkCanonicalConsumer(projectRoot: string, issues: PipelineIssue[]): void {
  const srcFiles = [
    'src/main.ts',
    'src/config/gameDefinition.ts',
    'src/config/bootConfig.ts',
    'src/config/slotConfig.ts',
    'src/config/featureConfig.ts',
    'src/config/audioConfig.ts',
    'src/config/hud/index.ts',
    'src/config/hud/hudConfig.ts',
    'src/config/hud/hudTheme.ts',
    'src/config/hud/paytableConfig.ts',
    'src/config/hud/betPanelConfig.ts',
    'src/config/hud/autoplayPanelConfig.ts',
    'src/config/hud/settingsPanelConfig.ts',
    'src/game/GameUI.ts',
    'src/game/WinFormatter.ts',
    'src/game/DemoResultSource.ts',
  ];

  const bannedDiTokens = ['createGameContainer', 'getCoreServices', 'ServiceTokens'];
  const bannedDiPattern = new RegExp(`\\b(${bannedDiTokens.join('|')})\\b`);

  for (const file of srcFiles) {
    const fullPath = path.join(projectRoot, file);
    if (!fs.existsSync(fullPath)) continue;

    const raw = fs.readFileSync(fullPath, 'utf-8');
    const scan = normalizedForScan(raw);

    if (/@fnx\/sl-engine\/internal/.test(scan)) {
      issues.push({
        code: IssueCodes.CONSUMER_INTERNAL_IMPORT,
        category: IssueCategory.PIPELINE,
        severity: 'error',
        message: 'Internal SDK import detected — use public API only',
        file,
      });
    }

    if (bannedDiPattern.test(scan)) {
      issues.push({
        code: IssueCodes.CONSUMER_INTERNAL_IMPORT,
        category: IssueCategory.PIPELINE,
        severity: 'error',
        message: 'DI-internal import detected (createGameContainer/getCoreServices/ServiceTokens) — use bootstrap() instead',
        file,
      });
    }
  }

  const mainPath = path.join(projectRoot, 'src/main.ts');
  if (!fs.existsSync(mainPath)) return;

  const mainRaw = fs.readFileSync(mainPath, 'utf-8');
  const mainScan = normalizedForScan(mainRaw);

  if (/\bnew\s+Game\s*\(/.test(mainScan)) {
    issues.push({
      code: IssueCodes.CONSUMER_DIRECT_GAME_CLASS,
      category: IssueCategory.PIPELINE,
      severity: 'warning',
      message: 'Direct Game class instantiation detected — use bootstrap() for canonical startup',
      file: 'src/main.ts',
    });
  }

  if (!/\bbootstrap\s*\(/.test(mainScan)) {
    issues.push({
      code: IssueCodes.CONSUMER_MISSING_BOOTSTRAP,
      category: IssueCategory.PIPELINE,
      severity: 'error',
      message: 'bootstrap() call not found in main.ts — canonical startup requires bootstrap()',
      file: 'src/main.ts',
    });
  }
}

function checkBuildConfig(projectRoot: string, issues: PipelineIssue[]): boolean {
  try {
    loadBuildConfig(projectRoot);
    return true;
  } catch (error) {
    issues.push({
      code: IssueCodes.CONFIG_INVALID,
      category: IssueCategory.CONFIG,
      severity: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

function checkGeneratedArtifacts(projectRoot: string, issues: PipelineIssue[]): void {
  const manifestPath = path.join(projectRoot, 'assets', 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    issues.push({
      code: IssueCodes.MANIFEST_MISSING,
      category: IssueCategory.MANIFEST,
      severity: 'warning',
      message: 'Manifest not found — run: pnpm assets',
      file: 'assets/manifest.json',
    });
  }

  const generatedDir = path.join(projectRoot, 'generated');
  if (!fs.existsSync(generatedDir)) {
    issues.push({
      code: IssueCodes.PIPELINE_DIR_MISSING,
      category: IssueCategory.PIPELINE,
      severity: 'advisory',
      message: 'generated/ directory missing — will be created when pipeline reports are enabled',
      file: 'generated/',
    });
  }
}

function checkMaskTopology(issues: PipelineIssue[]): void {
  const definition = composeEngineGameDefinition(templateGameConfig, {
    slotConfig,
    bootConfig,
    fallbackSpinFeelPreset: starterRuntimeBuildConfig.spinFeelPreset,
    audioConfig: audioProfile,
    featureConfig,
    createResultSource: () => ({}) as never,
    canvasClearColorFromBuild: starterRuntimeBuildConfig.display.canvasClearColorFromBuild,
  });
  if (definition.reelMasks && definition.orientation) {
    issues.push({
      code: IssueCodes.CONFIG_INVALID,
      category: IssueCategory.CONFIG,
      severity: 'error',
      message: 'Composed definition has both top-level reelMasks and orientation config; top-level masks must be fallback-only.',
      file: 'src/config/composeEngineGameDefinition.ts',
    });
  }

  const maxRows = Math.max(...slotConfig.layout.rowsPerReel);
  const checkOrientation = (orientation: 'portrait' | 'landscape'): void => {
    const profile = definition.orientation?.[orientation];
    const mask = profile?.reelMasks?.[0];
    if (!profile || !mask) return;
    const layout = profile.layout;
    if (!layout?.symbolHeight || !layout?.symbolWidth) {
      issues.push({
        code: IssueCodes.CONFIG_INVALID,
        category: IssueCategory.CONFIG,
        severity: 'error',
        message: `orientation.${orientation}.layout must define symbolWidth and symbolHeight to validate mask geometry.`,
        file: 'src/config/composeEngineGameDefinition.ts',
      });
      return;
    }
    const symbolGap = layout.symbolGap ?? 0;
    const expectedHeight = maxRows * layout.symbolHeight + Math.max(0, maxRows - 1) * symbolGap;
    const expectedWidth = layout.symbolWidth;
    if (mask.height === undefined || Math.abs(mask.height - expectedHeight) > 0.001) {
      issues.push({
        code: IssueCodes.CONFIG_INVALID,
        category: IssueCategory.CONFIG,
        severity: 'error',
        message: `orientation.${orientation}.reelMasks[0].height must match derived grid height (${expectedHeight}).`,
        file: 'src/config/templateGameConfig.ts',
      });
    }
    if (mask.width === undefined || Math.abs(mask.width - expectedWidth) > 0.001) {
      issues.push({
        code: IssueCodes.CONFIG_INVALID,
        category: IssueCategory.CONFIG,
        severity: 'error',
        message: `orientation.${orientation}.reelMasks[0].width must match derived symbol width (${expectedWidth}).`,
        file: 'src/config/templateGameConfig.ts',
      });
    }
  };
  checkOrientation('portrait');
  checkOrientation('landscape');
}

export async function runDoctor(options: RunDoctorOptions = {}): Promise<PipelineReport> {
  const logger = options.logger ?? console;
  const projectRoot = resolveProjectRoot(options.rootDir);
  const writeJson = options.writeJson === true;

  logger.log('Cleopatra Doctor\n');
  logger.log('='.repeat(60));

  const allIssues: PipelineIssue[] = [];
  const subReports: PipelineReport[] = [];

  logger.log('\n  [1/10] Build config...');
  const configValid = checkBuildConfig(projectRoot, allIssues);

  logger.log('  [2/10] HUD runtime shell config...');
  const hudReport = await validateStarterHudConfig(projectRoot);
  subReports.push(hudReport);
  allIssues.push(...hudReport.issues);

  const manifestPath = path.join(projectRoot, 'assets', 'manifest.json');

  if (configValid) {
    logger.log('  [3/10] Project structure & canonical consumer...');
    checkProjectStructure(projectRoot, allIssues);
    checkSdkInstalled(projectRoot, allIssues);
    checkEntryPoints(projectRoot, allIssues);
    checkConfigFiles(projectRoot, allIssues);
    checkGameFiles(projectRoot, allIssues);
    checkGeneratedArtifacts(projectRoot, allIssues);
    checkCanonicalConsumer(projectRoot, allIssues);
    checkMaskTopology(allIssues);

    logger.log('  [4/10] Template game config...');
    const templateConfigReport = validateTemplateGameConfig(projectRoot);
    subReports.push(templateConfigReport);
    allIssues.push(...templateConfigReport.issues);

    logger.log('  [5/10] Asset validation...');
    const assetReport = validateAssets(projectRoot);
    subReports.push(assetReport);
    allIssues.push(...assetReport.issues);

    logger.log('  [6/10] Manifest validation...');
    if (fs.existsSync(manifestPath)) {
      const manifestReport = validateManifest(projectRoot);
      subReports.push(manifestReport);
      allIssues.push(...manifestReport.issues);
    }

    logger.log('  [7/10] Referenced asset keys...');
    if (fs.existsSync(manifestPath)) {
      const referencedKeysReport = validateReferencedKeys(projectRoot);
      if (!referencedKeysReport.metadata?.skipped) {
        subReports.push(referencedKeysReport);
        allIssues.push(...referencedKeysReport.issues);
      }
    }

    logger.log('  [8/10] Production SFX (no starter placeholders)...');
    const productionSfxReport = validateCleopatraProductionSfx(projectRoot);
    subReports.push(productionSfxReport);
    allIssues.push(...productionSfxReport.issues);

    logger.log('  [9/10] Spine validation...');
    const spineReport = validateSpine(projectRoot);
    subReports.push(spineReport);
    allIssues.push(...spineReport.issues);

    logger.log('  [10/10] Loading validation...');
    if (fs.existsSync(manifestPath)) {
      const loadingReport = validateLoading(projectRoot);
      subReports.push(loadingReport);
      allIssues.push(...loadingReport.issues);
    }

  } else {
    logger.log('  [3-10] Skipped — build-config.json is invalid');
  }

  const report = createReport('doctor', allIssues, {
    subReportCount: subReports.length,
    subReports: subReports.map((subReport) => ({
      tool: subReport.tool,
      passed: subReport.passed,
      errors: subReport.summary.errors,
      warnings: subReport.summary.warnings,
    })),
  });

  logger.log(`\n${'='.repeat(60)}`);

  if (report.issues.length > 0) {
    logger.log('');
    printReport(report);
  }

  const total = report.issues.length;
  logger.log(`\n  ${total} issues total — ${report.summary.errors} errors, ${report.summary.warnings} warnings, ${report.summary.advisories} advisories`);

  if (writeJson) {
    const generatedDir = path.join(projectRoot, 'generated');
    fs.mkdirSync(generatedDir, { recursive: true });
    const reportPath = path.join(generatedDir, 'doctor-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf-8');
    logger.log(`  Report written: ${reportPath}`);
  }

  if (!report.passed) {
    logger.log('\n  Doctor found errors. Fix them before building.\n');
  } else if (report.summary.warnings > 0) {
    logger.log('\n  Doctor passed with warnings.\n');
  } else {
    logger.log('\n  All checks passed.\n');
  }

  return report;
}
