# Cleopatra Asset and Symbol Intent Migration (Phase 8)

## Executive verdict

**PASS (production-hardened).** Cleopatra authors asset and symbol contracts through engine intent APIs. Runtime `slotConfig.symbols` presentation is composed from `cleopatraSlotSymbolsIntent` via `normalizeSlotSymbols` (single source of truth). Doctor and `pnpm assets` delegate schema validation to `validateSlotTemplateIntent`; local duplicate checks and backward-compat shims were removed.

**No SL-Engine runtime, starter template, runtime loader, symbol display runtime, WinViz runtime, or old module runtime files were changed.**

## Architecture (10/10 target)

| Layer | Authority |
|-------|-----------|
| `assetManifestIntent.ts` | Asset keys, paths, bundles (authoring) |
| `slotSymbolsIntent.ts` | Symbol ids, asset keys, animation maps (authoring) |
| `composeCleopatraSlotSymbols.ts` | Intent → `SlotConfig` presentation (runtime) |
| `slotConfig.ts` | Gameplay only: reels, paytable, paylines, `SYMBOL` enum |
| `assets/manifest.json` | Generator output (disk/runtime loader) |
| Engine `validateSlot*` | Schema, duplicate ids/keys, assetKey cross-check, idle-alias warnings |

## Files changed

| File | Change |
|------|--------|
| `src/config/assetManifestIntent.ts` | Asset manifest intent authoring |
| `src/config/slotSymbolsIntent.ts` | Symbol intent authoring (idle-only win clips) |
| `src/config/composeCleopatraSlotSymbols.ts` | **New** — `normalizeSlotSymbols` → runtime symbols |
| `src/config/slotConfig.ts` | Symbols composed from intent; removed `animatedSheetSymbol` duplicate + allowlist |
| `src/config/templateIntent.ts` | Combined template intent |
| `src/config/buildConfigRuntime.ts` | JSON import attribute for Node 22+ doctor |
| `tools/local/pipeline/templateIntentValidate.ts` | Engine delegation + manifest/slot cross-checks |
| `tools/local/pipeline/manifestKeys.ts` | **New** — shared manifest key reader |
| `tools/local/pipeline/referencedKeysValidate.ts` | Scene/audio only (no symbol shim) |
| `tools/local/pipeline/symbolWinClipValidate.ts` | Disk spritesheet clip keys only (intent-sourced) |
| `tools/local/pipeline/templateConfigValidate.ts` | Removed duplicate win-intent + manifest scene checks |
| `tools/local/pipeline/pipeline.ts` | Template intent validation after manifest write |
| `tools/validate-template-intent.ts` | Deterministic proof script |

## Removed (no backward compat)

- `animatedSheetSymbol()` duplicate presentation helper in `slotConfig.ts`
- `SYMBOLS_WITHOUT_DISTINCT_WIN_CLIP` allowlist (engine `TEMPLATE_SYMBOL_WINSTART_ALIASES_IDLE` warnings replace it)
- `hasCleopatraTemplateIntent()` conditional skip in `referencedKeysValidate.ts`
- Duplicate `validateWinPresentationIntent` pass in template config step 4 (owned by step 5)
- Duplicate scene `assetKey` vs manifest checks in template config (owned by referenced-keys + intent drift)
- Regex-based `extractSlotConfigSpriteKeys` (replaced by composed `slotConfig` import in intent validator)

## Symbol intent shape

- Fifteen symbols (`id` `'0'`–`'14'`), `displayType: 'animatedSprite'`.
- `assetKey` matches manifest spritesheet keys.
- `animations`: `{ idle: 'idle', winStart: 'idle', winEnd: 'idle' }` (asset truth).

## Validation delegation

| Check | Owner |
|-------|--------|
| Asset manifest schema, duplicate keys | `validateSlotAssetManifest` |
| Symbol ids, animations, assetKey cross-check | `validateSlotSymbols` / `validateSlotTemplateIntent` |
| Win presentation intent | `validateSlotTemplateIntent` (step 5 only) |
| Composed slotConfig ↔ intent assetKey | `templateIntentValidate.ts` |
| Intent ↔ generated manifest | `templateIntentValidate.ts` + `pnpm assets` pipeline step |
| Scene/audio referenced keys | `referencedKeysValidate.ts` |
| Spritesheet clip keys on disk | `symbolWinClipValidate.ts` |

## Idle-only clip limitation

All reel symbols map `winStart` → `idle`. Engine emits `TEMPLATE_SYMBOL_WINSTART_ALIASES_IDLE` (warning). This phase does not add distinct win clips or fix first-loop motion; visibility still depends on `clipWithOverlay` until real clips exist.

## Commands run

```bash
pnpm build:sdk          # SL-Engine
pnpm install
pnpm typecheck
pnpm build
pnpm validate:template-intent
pnpm doctor             # runs; audio manifest gaps are pre-existing (not Phase 8)
```

## Commit message

```
refactor(cleopatra): harden asset and symbol intent as single source of truth
```
