# SL-Engine Starter Asset Pipeline

## Purpose

Starter asset processing is exposed through one starter command shell:

- command shell: `tools/assets.ts`
- implementation: starter-local tooling under `tools/local/**`

## Command Surface

- `pnpm assets` — full pipeline (generate + validate)
- `pnpm run doctor` — project health checks, including asset-manifest validation
- `pnpm validate:manifest-intent` — intent ↔ committed manifest drift check
- `pnpm validate:template-intent` — template/symbol/win-presentation intent schema
- `pnpm validate:production-sfx` — production SFX gate (placeholder-byte detection)

Optional JSON diagnostics:

- `pnpm assets -- --json` → `generated/pipeline-report.json`
- `pnpm run doctor -- --json` → `generated/doctor-report.json`

## Pipeline Inputs

- `build-config.json`
- `src/config/assetManifestIntent.ts` — sole authoring source for manifest keys, paths, and bundles (audio entries composed from `src/config/audioConfig.ts`)
- asset files under `assets/**` (validated on disk; not scanned to invent manifest keys)
- starter runtime config surfaces used by validation

## Manifest authority

`cleopatraAssetManifestIntent` → `pnpm assets` → `assets/manifest.json` → runtime loader.

- No disk-scan manifest authority
- Intent types `image` / `spritesheet` convert to runtime `texture` / `spritesheet` (see `INTENT_TO_RUNTIME_ASSET_TYPE` in `tools/local/pipeline/manifestFromIntent.ts`)
- `writeManifestFromIntent` writes only when generation passes — invalid intent never overwrites the committed manifest
- Doctor and `validate:manifest-intent` fail with `MANIFEST_STALE` when the committed manifest differs from intent-generated output

## Production SFX gate (Cleopatra)

Required spin/win SFX are authored in `src/config/audioConfig.ts` (`cleopatraSfxManifestAssets`). Tooling rejects starter placeholder bytes (MD5 `9454fce1ce41278f4f5e9619f1a19413`).

| Command | Includes SFX gate? |
|---------|-------------------|
| `pnpm validate:production-sfx` | Yes (standalone) |
| `pnpm assets` | Yes (`sfx-production:validate` step) |
| `pnpm doctor` | Yes (step 9/12) |
| `pnpm typecheck` / `pnpm build` | No |

While placeholder WAVs remain on disk, `validate:production-sfx`, `pnpm assets`, and `pnpm doctor` **must fail** with `SFX_PLACEHOLDER_BYTE_IDENTICAL`. That is correct production-strict behavior — not a tooling defect.

Handoff: [CLEOPATRA_PRODUCTION_SFX_HANDOFF.md](./CLEOPATRA_PRODUCTION_SFX_HANDOFF.md) · Checklist: [CLEOPATRA_PRODUCTION_SFX_REPLACEMENT_CHECKLIST.md](./CLEOPATRA_PRODUCTION_SFX_REPLACEMENT_CHECKLIST.md)

## Pipeline Outputs

| Path | Produced by | Committed | Runtime-required |
|---|---|---|---|
| `assets/manifest.json` | `pnpm assets` | Yes | Yes |
| `assets/sfx_*.wav` | Authored (see `src/config/audioConfig.ts`) | Yes | Yes |
| `src/Asset.d.ts` | `pnpm assets` | Yes | No |
| `generated/asset-suggestions.json` | `pnpm assets` | No | No |
| `generated/pipeline-report.json` | `pnpm assets -- --json` | No | No |
| `generated/doctor-report.json` | `pnpm run doctor -- --json` | No | No |

## Runtime Alignment Rules

- manifest output must satisfy runtime manifest validation
- generated manifest is derived from asset manifest intent plus build config (version, baseUrl)
- disk checks validate referenced files and warn on orphans; they do not author manifest keys
- runtime does not depend on DX artifacts (`src/Asset.d.ts`, `generated/*.json`)
- if manifest/artifact outputs drift, run `pnpm assets`
