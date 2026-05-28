# Cleopatra Asset Manifest Intent Generation (Phase 9)

## Executive verdict

**PASS.** `cleopatraAssetManifestIntent` is the sole authoring source for `assets/manifest.json`. `pnpm assets` validates and normalizes intent, converts intent types to runtime loader types, writes deterministic JSON, and drift-checks the committed manifest. Disk scan no longer authors manifest keys; `manifestValidate` still checks file existence and orphaned assets.

**No SL-Engine runtime, starter template, runtime loader, symbol display runtime, WinViz runtime, or old module runtime files were changed.**

## Files changed

| File | Change |
|------|--------|
| `tools/local/pipeline/manifestFromIntent.ts` | **New** — intent → runtime manifest generator, drift check, type conversion |
| `tools/local/pipeline/manifestGenerate.ts` | Re-export intent generator (removed disk-scan authority) |
| `tools/local/pipeline/manifestValidate.ts` | Drift check via `checkManifestIntentDrift` (`MANIFEST_STALE`) |
| `tools/validate-manifest-from-intent.ts` | **New** — deterministic proof script |
| `src/config/assetManifestIntent.ts` | Comment: intent generates manifest |
| `package.json` | `validate:manifest-intent` script |
| `docs/ASSET_PIPELINE.md` | Document intent authority |
| `assets/manifest.json` | Regenerated from intent (adds `meta.symbolId` on symbol spritesheets) |

## Generation flow

```
cleopatraAssetManifestIntent
  → validateSlotAssetManifest
  → normalizeSlotAssetManifest
  → INTENT_TO_RUNTIME_ASSET_TYPE conversion
  → bundle classification (inferSlotBundleClassification)
  → serializeRuntimeManifest
  → assets/manifest.json
```

Command: `pnpm assets` (pipeline step `manifest:generate`).

## Runtime type conversion

| Intent type | Runtime manifest type |
|-------------|----------------------|
| `image` | `texture` |
| `sprite` | `texture` |
| `spritesheet` | `spritesheet` |
| `spine` | `spine` |
| `audio` | `audio` |
| `audioSprite` | `audioSprite` |
| `json` | `json` |
| `bitmapFont`, `font` | `font` |

Unknown intent types throw before write. Mapping lives in `INTENT_TO_RUNTIME_ASSET_TYPE` (`manifestFromIntent.ts`).

## Validation rules

- Engine: duplicate keys, unknown types, missing source, bundle references (`validateSlotAssetManifest`)
- Generator: runtime Zod schema, duplicate runtime keys, referenced files exist on disk
- Drift: `checkManifestIntentDrift` — serialized intent output must equal committed `assets/manifest.json` (`MANIFEST_STALE` → run `pnpm assets`)
- Orphans: warning-only in `manifestValidate` (disk files not in manifest)

## Drift check behavior

- **When:** `manifest:validate` (assets pipeline), `pnpm validate:manifest-intent`, doctor step `[7/11]`
- **How:** Regenerate manifest in memory, `serializeRuntimeManifest`, byte-compare to committed file
- **Fix:** `pnpm assets` (no auto-fix in doctor)

## Commands run

```bash
# SL-Engine
pnpm build:sdk

# Cleopatra
pnpm install
pnpm assets                    # manifest:generate PASS; 7 pre-existing audio referenced-key errors
pnpm validate:manifest-intent  # PASS (23 keys, drift, stability)
pnpm validate:template-intent  # PASS
pnpm typecheck                 # PASS
pnpm build                     # PASS
pnpm doctor                    # FAIL — 7 pre-existing missing SFX keys only
```

## Pre-existing missing SFX (not Phase 9)

`audioConfig.REFERENCED_AUDIO_ASSET_KEYS` references keys not declared in asset manifest intent (audio is a separate migration). Doctor / `pnpm assets` report:

- `sfx_spin_start`
- `sfx_reel_stop_a`
- `sfx_reel_stop_b`
- `sfx_win_small`
- `sfx_win_medium`
- `sfx_win_big`
- `sfx_win_mega`

## Commit message

```
refactor(cleopatra): generate runtime manifest from asset intent
```
