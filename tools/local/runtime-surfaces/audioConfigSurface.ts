import { fileExists, readTextFile } from '../utils/fs.ts';
import { resolveFromProjectRoot } from '../utils/paths.ts';

/**
 * Extract audio asset keys from audioConfig.ts.
 * Pattern: REFERENCED_AUDIO_ASSET_KEYS = ['key_a', "key_b", ...] as const
 */
export function extractAudioConfigReferencedKeys(projectRoot: string): Set<string> {
  const audioConfigPath = resolveFromProjectRoot(projectRoot, 'src/config/audioConfig.ts');
  if (!fileExists(audioConfigPath)) return new Set();

  const content = readTextFile(audioConfigPath);
  const arrayMatch = content.match(/REFERENCED_AUDIO_ASSET_KEYS\s*=\s*\[([\s\S]*?)\]\s*as const/);
  if (!arrayMatch?.[1]) return new Set();

  const keys = new Set<string>();
  const valueRe = /['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = valueRe.exec(arrayMatch[1])) !== null) {
    const key = match[1]?.trim();
    if (key) keys.add(key);
  }

  return keys;
}
