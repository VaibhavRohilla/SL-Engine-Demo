# SL-Engine Starter Asset Pipeline

## Purpose

Starter asset processing is exposed through one starter command shell:

- command shell: `tools/assets.ts`
- implementation: starter-local tooling under `tools/local/**`

## Command Surface

- `pnpm assets` — full pipeline (generate + validate)
- `pnpm run doctor` — project health checks, including asset-manifest validation

Optional JSON diagnostics:

- `pnpm assets -- --json` → `generated/pipeline-report.json`
- `pnpm run doctor -- --json` → `generated/doctor-report.json`

## Pipeline Inputs

- `build-config.json`
- authored assets under `assets/**`
- starter runtime config surfaces used by validation

## Pipeline Outputs

| Path | Produced by | Committed | Runtime-required |
|---|---|---|---|
| `assets/manifest.json` | `pnpm assets` | Yes | Yes |
| `assets/audio/sprites/*` | `pnpm assets` | Yes | Yes (if audio sprites enabled) |
| `src/Asset.d.ts` | `pnpm assets` | Yes | No |
| `generated/asset-suggestions.json` | `pnpm assets` | No | No |
| `generated/pipeline-report.json` | `pnpm assets -- --json` | No | No |
| `generated/doctor-report.json` | `pnpm run doctor -- --json` | No | No |

## Runtime Alignment Rules

- manifest output must satisfy runtime manifest validation
- generated outputs are derived from authored assets plus config input
- runtime does not depend on DX artifacts (`src/Asset.d.ts`, `generated/*.json`)
- if manifest/artifact outputs drift, run `pnpm assets`
