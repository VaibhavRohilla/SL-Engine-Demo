/**
 * Audio Sprite Builder — Canonical audio sprite pipeline.
 *
 * Scans the SFX directory, concatenates audio files into a single sprite
 * using ffmpeg (when available), and writes a sprite map JSON.
 *
 * Input:  assets/audio/sfx/  (individual .mp3/.ogg/.wav files)
 * Output: assets/audio/sprites/sfx_sprite.mp3   (concatenated audio)
 *         assets/audio/sprites/sfx_sprite.ogg   (concatenated audio, alt format)
 *         assets/audio/sprites/sfx_sprite.json  (sprite map)
 *
 * Sprite map contract (aligned with runtime IAudioBus.loadSprite):
 *   { sprites: { clipName: [startMs, durationMs], ... } }
 *
 * The manifest generator will create audioSprite entries referencing these
 * outputs. Runtime loads them via AssetAPI.loadAudioSprite which reads
 * the sprite map from urls.sprite.
 *
 * When ffmpeg is unavailable, generates a stub sprite map with estimated
 * timings and emits a warning. This allows development to proceed while
 * flagging that the audio output is not production-ready.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { loadBuildConfig, resolveAssetPath } from '../config/buildConfigLoader.ts';
import { STARTER_CONVENTIONS } from '../constants/conventions.ts';
import {
  type PipelineIssue,
  IssueCategory,
  IssueCodes,
  createReport,
} from './pipelineTypes.ts';

interface SpriteMap {
  sprites: Record<string, [number, number]>;
}

function hasFfmpeg(): boolean {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Probe audio file duration in milliseconds using ffprobe.
 * Returns null if ffprobe is unavailable or fails.
 */
function probeDurationMs(filePath: string): number | null {
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`,
      { encoding: 'utf-8' },
    ).trim();
    const seconds = parseFloat(out);
    if (isNaN(seconds)) return null;
    return Math.round(seconds * 1000);
  } catch {
    return null;
  }
}

/**
 * Concatenate audio files into a single sprite using ffmpeg.
 * Generates both mp3 and ogg outputs for browser compatibility.
 * Returns the sprite map with real timings.
 */
function buildRealSprite(
  sfxDir: string,
  audioFiles: string[],
  outDir: string,
  spriteName: string,
  issues: PipelineIssue[],
): SpriteMap {
  const sprites: Record<string, [number, number]> = {};
  const gapMs = 100;
  let offset = 0;

  const durations: { file: string; name: string; durationMs: number }[] = [];
  for (const file of audioFiles) {
    const filePath = path.join(sfxDir, file);
    const name = path.basename(file, path.extname(file));
    const durationMs = probeDurationMs(filePath);

    if (durationMs === null || durationMs <= 0) {
      issues.push({
        code: IssueCodes.AUDIO_FORMAT_INVALID,
        category: IssueCategory.AUDIO,
        severity: 'warning',
        message: `Could not probe duration for "${file}", using estimate`,
        file,
      });
      durations.push({ file, name, durationMs: 1000 });
    } else {
      durations.push({ file, name, durationMs });
    }
  }

  for (const { name, durationMs } of durations) {
    sprites[name] = [offset, durationMs];
    offset += durationMs + gapMs;
  }

  const inputPaths = audioFiles.map(f => path.join(sfxDir, f));
  const concatFilter = inputPaths.map((_, i) => `[${i}:a]`).join('') +
    `concat=n=${inputPaths.length}:v=0:a=1[out]`;
  const inputArgs = inputPaths.map(p => `-i "${p}"`).join(' ');

  for (const ext of ['mp3', 'ogg'] as const) {
    const outPath = path.join(outDir, `${spriteName}.${ext}`);
    const codec = ext === 'mp3' ? '-codec:a libmp3lame -q:a 2' : '-codec:a libvorbis -q:a 4';
    const cmd = `ffmpeg -y ${inputArgs} -filter_complex "${concatFilter}" -map "[out]" ${codec} "${outPath}"`;

    try {
      execSync(cmd, { stdio: 'pipe' });
    } catch (err) {
      issues.push({
        code: IssueCodes.AUDIO_FORMAT_INVALID,
        category: IssueCategory.AUDIO,
        severity: 'warning',
        message: `ffmpeg ${ext} encoding failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  return { sprites };
}

/**
 * Generate a stub sprite map without real audio concatenation.
 * Used when ffmpeg is not available. Produces a valid sprite map
 * with estimated timings so that development can proceed.
 */
function buildStubSprite(audioFiles: string[]): SpriteMap {
  const sprites: Record<string, [number, number]> = {};
  const estimatedDurationMs = 1000;
  const gapMs = 100;
  let offset = 0;

  for (const file of audioFiles) {
    const name = path.basename(file, path.extname(file));
    sprites[name] = [offset, estimatedDurationMs];
    offset += estimatedDurationMs + gapMs;
  }

  return { sprites };
}

export function buildAudioSprites(rootDir?: string): ReturnType<typeof createReport> {
  const issues: PipelineIssue[] = [];
  const { rootDir: projectRoot } = loadBuildConfig(rootDir);

  const sfxDir = resolveAssetPath(STARTER_CONVENTIONS.audioSfxDir, projectRoot);
  const outDir = resolveAssetPath(STARTER_CONVENTIONS.audioSpriteOutDir, projectRoot);

  if (!fs.existsSync(sfxDir)) {
    return createReport('audio:build', issues, { skipped: true, reason: 'no-sfx-dir' });
  }

  const audioFiles = fs.readdirSync(sfxDir)
    .filter(f => ['.mp3', '.ogg', '.wav'].includes(path.extname(f).toLowerCase()))
    .sort();

  if (audioFiles.length === 0) {
    issues.push({
      code: IssueCodes.AUDIO_NO_INPUT,
      category: IssueCategory.AUDIO,
      severity: 'advisory',
      message: 'No audio files found in SFX directory',
    });
    return createReport('audio:build', issues, { fileCount: 0 });
  }

  fs.mkdirSync(outDir, { recursive: true });
  const spriteName = 'sfx_sprite';
  let spriteMap: SpriteMap;
  const ffmpegAvailable = hasFfmpeg();

  if (ffmpegAvailable) {
    spriteMap = buildRealSprite(sfxDir, audioFiles, outDir, spriteName, issues);
  } else {
    issues.push({
      code: IssueCodes.AUDIO_FFMPEG_MISSING,
      category: IssueCategory.AUDIO,
      severity: 'warning',
      message: 'ffmpeg not found — generating stub sprite map with estimated timings',
    });
    spriteMap = buildStubSprite(audioFiles);
  }

  const outputPath = path.join(outDir, `${spriteName}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(spriteMap, null, 2) + '\n');

  return createReport('audio:build', issues, {
    fileCount: audioFiles.length,
    clipCount: Object.keys(spriteMap.sprites).length,
    ffmpeg: ffmpegAvailable,
    outputPath,
  });
}
