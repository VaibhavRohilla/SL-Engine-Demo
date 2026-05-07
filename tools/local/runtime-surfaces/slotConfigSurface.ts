import { fileExists, readTextFile } from '../utils/fs.ts';
import { resolveFromProjectRoot } from '../utils/paths.ts';

/**
 * Extract manifest spritesheet keys used for reel symbols from slotConfig.ts.
 * Patterns:
 * - spriteKey: 'key' or spriteKey: "key" (inline literal)
 * - animatedSheetSymbol('key') helper (spread into symbol defs)
 */
export function extractSlotConfigSpriteKeys(projectRoot: string): Set<string> {
  const slotConfigPath = resolveFromProjectRoot(projectRoot, 'src/config/slotConfig.ts');
  if (!fileExists(slotConfigPath)) return new Set();

  const content = readTextFile(slotConfigPath);
  const keys = new Set<string>();

  const addFromRe = (re: RegExp) => {
    let match: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((match = re.exec(content)) !== null) {
      const key = match[1]?.trim();
      if (key) keys.add(key);
    }
  };

  addFromRe(/spriteKey\s*:\s*['"]([^'"]+)['"]/g);
  addFromRe(/animatedSheetSymbol\(\s*['"]([^'"]+)['"]\s*\)/g);

  return keys;
}
