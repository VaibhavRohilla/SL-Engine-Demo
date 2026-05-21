/**
 * Asset Validation — Comprehensive asset health check.
 *
 * Scans the assets/ directory for common problems: junk files,
 * oversized assets, and structural issues. Works independently
 * of the manifest (manifest-validate handles manifest-specific checks).
 *
 * This tool focuses on disk-level asset hygiene.
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadBuildConfig, resolveAssetPath } from '../config/buildConfigLoader.ts';
import {
  type PipelineIssue,
  IssueCategory,
  IssueCodes,
  createReport,
} from './pipelineTypes.ts';

const JUNK_NAMES = new Set(['__MACOSX', '.DS_Store', 'Thumbs.db', 'desktop.ini', '.Spotlight-V100']);
const MAX_WARNING_BYTES = 5 * 1024 * 1024;
const MAX_ERROR_BYTES = 20 * 1024 * 1024;

function scanForJunk(dir: string, rel: string, issues: PipelineIssue[]): void {
  if (!fs.existsSync(dir)) return;

  for (const item of fs.readdirSync(dir).sort()) {
    const fullPath = path.join(dir, item);
    const relPath = rel ? `${rel}/${item}` : item;

    if (JUNK_NAMES.has(item)) {
      issues.push({
        code: IssueCodes.ASSET_JUNK_FILE,
        category: IssueCategory.ASSET,
        severity: 'warning',
        message: 'Junk file/directory found — remove before production',
        file: relPath,
      });
      continue;
    }

    if (fs.statSync(fullPath).isDirectory()) {
      scanForJunk(fullPath, relPath, issues);
    }
  }
}

function scanForOversized(dir: string, rel: string, issues: PipelineIssue[]): void {
  if (!fs.existsSync(dir)) return;

  for (const item of fs.readdirSync(dir).sort()) {
    const fullPath = path.join(dir, item);
    const relPath = rel ? `${rel}/${item}` : item;
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanForOversized(fullPath, relPath, issues);
    } else if (stat.size > MAX_ERROR_BYTES) {
      const mb = (stat.size / (1024 * 1024)).toFixed(1);
      issues.push({
        code: IssueCodes.ASSET_OVERSIZED_CRITICAL,
        category: IssueCategory.ASSET,
        severity: 'error',
        message: `File exceeds 20MB (${mb}MB) — will cause load performance issues`,
        file: relPath,
      });
    } else if (stat.size > MAX_WARNING_BYTES) {
      const mb = (stat.size / (1024 * 1024)).toFixed(1);
      issues.push({
        code: IssueCodes.ASSET_OVERSIZED,
        category: IssueCategory.ASSET,
        severity: 'warning',
        message: `File exceeds 5MB (${mb}MB) — consider optimizing`,
        file: relPath,
      });
    }
  }
}

function checkDirectoryStructure(issues: PipelineIssue[], rootDir?: string): void {
  const resolve = (p: string) => resolveAssetPath(p, rootDir);

  const assetsDir = resolve('assets');
  if (!fs.existsSync(assetsDir)) {
    issues.push({
      code: IssueCodes.ASSET_MISSING_DIR,
      category: IssueCategory.ASSET,
      severity: 'error',
      message: 'Assets directory not found',
      file: 'assets/',
    });
  }
}

export function validateAssets(rootDir?: string): ReturnType<typeof createReport> {
  const issues: PipelineIssue[] = [];
  const { rootDir: projectRoot } = loadBuildConfig(rootDir);
  const assetsDir = resolveAssetPath('assets', projectRoot);

  checkDirectoryStructure(issues, projectRoot);

  if (fs.existsSync(assetsDir)) {
    scanForJunk(assetsDir, '', issues);
    scanForOversized(assetsDir, '', issues);
  }

  return createReport('assets:validate', issues);
}
