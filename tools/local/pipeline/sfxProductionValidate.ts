/**
 * Cleopatra production SFX validation — required gate for doctor and asset pipeline.
 * Fails while starter placeholder audio (byte-identical ~200ms WAVs) remains on disk.
 */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { cleopatraSfxManifestAssets } from '../../../src/config/audioConfig.ts';
import { resolveProjectRoot } from '../utils/paths.ts';
import {
  type PipelineIssue,
  IssueCategory,
  IssueCodes,
  createReport,
} from './pipelineTypes.ts';

/** MD5 of SL-Engine classic starter ~200ms placeholder tone (all seven Cleopatra SFX match today). */
export const CLEOPATRA_STARTER_PLACEHOLDER_SFX_MD5 = '9454fce1ce41278f4f5e9619f1a19413';

function md5File(filePath: string): string {
  const hash = createHash('md5');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function wavDurationSeconds(filePath: string): number | null {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 44 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    return null;
  }
  let offset = 12;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let channels = 0;
  let dataBytes = 0;
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkDataStart = offset + 8;
    if (chunkId === 'fmt ' && chunkSize >= 16) {
      channels = buffer.readUInt16LE(chunkDataStart + 2);
      sampleRate = buffer.readUInt32LE(chunkDataStart + 4);
      bitsPerSample = buffer.readUInt16LE(chunkDataStart + 14);
    } else if (chunkId === 'data') {
      dataBytes = chunkSize;
    }
    offset = chunkDataStart + chunkSize + (chunkSize % 2);
  }
  if (sampleRate <= 0 || bitsPerSample <= 0 || channels <= 0 || dataBytes <= 0) return null;
  const bytesPerSample = (bitsPerSample / 8) * channels;
  return dataBytes / (sampleRate * bytesPerSample);
}

export function validateCleopatraProductionSfx(rootDir?: string) {
  const projectRoot = resolveProjectRoot(rootDir);
  const assetsRoot = path.join(projectRoot, 'assets');
  const issues: PipelineIssue[] = [];
  const digests = new Map<string, string[]>();

  for (const entry of cleopatraSfxManifestAssets) {
    const filePath = path.join(assetsRoot, entry.path);
    if (!fs.existsSync(filePath)) {
      issues.push({
        code: IssueCodes.SFX_FILE_MISSING,
        category: IssueCategory.ASSET,
        severity: 'error',
        message: `Production SFX error: key="${entry.key}" file="assets/${entry.path}" is missing. Add the WAV at that path (see docs/CLEOPATRA_PRODUCTION_SFX_HANDOFF.md), then run: pnpm assets && pnpm validate:production-sfx`,
        file: entry.path,
        context: { key: entry.key },
      });
      continue;
    }
    const stat = fs.statSync(filePath);
    if (stat.size === 0) {
      issues.push({
        code: IssueCodes.SFX_FILE_EMPTY,
        category: IssueCategory.ASSET,
        severity: 'error',
        message: `Production SFX error: key="${entry.key}" file="assets/${entry.path}" is zero bytes. Replace with a valid production WAV, then run: pnpm validate:production-sfx`,
        file: entry.path,
        context: { key: entry.key },
      });
      continue;
    }
    const digest = md5File(filePath);
    const keys = digests.get(digest) ?? [];
    keys.push(entry.key);
    digests.set(digest, keys);

    if (digest === CLEOPATRA_STARTER_PLACEHOLDER_SFX_MD5) {
      const duration = wavDurationSeconds(filePath);
      issues.push({
        code: IssueCodes.SFX_PLACEHOLDER_BYTE_IDENTICAL,
        category: IssueCategory.ASSET,
        severity: 'error',
        message: `Production SFX error: key="${entry.key}" file="assets/${entry.path}" matches starter placeholder bytes (md5=${digest}, duration=${duration ?? 'unknown'}s). Replace file bytes in place with Cleopatra production audio — do not reuse the same placeholder for all keys. See docs/CLEOPATRA_PRODUCTION_SFX_HANDOFF.md and docs/CLEOPATRA_PRODUCTION_SFX_REPLACEMENT_CHECKLIST.md. Fix, then run: pnpm validate:production-sfx`,
        file: entry.path,
        context: { key: entry.key, md5: digest, durationSeconds: duration, placeholder: true },
      });
    }
  }

  for (const [digest, keys] of digests) {
    if (keys.length > 1 && digest !== CLEOPATRA_STARTER_PLACEHOLDER_SFX_MD5) {
      issues.push({
        code: IssueCodes.SFX_PLACEHOLDER_BYTE_IDENTICAL,
        category: IssueCategory.ASSET,
        severity: 'warning',
        message: `Production SFX advisory: keys [${keys.join(', ')}] share identical non-placeholder bytes (md5=${digest}). Each key should have distinct production audio; see docs/CLEOPATRA_PRODUCTION_SFX_HANDOFF.md`,
        context: { keys, md5: digest, placeholder: false },
      });
    }
  }

  return createReport('sfx-production:validate', issues, {
    requiredKeys: cleopatraSfxManifestAssets.map((entry) => entry.key),
    uniqueDigests: digests.size,
  });
}
