# Cleopatra Win Presentation Intent Migration (Phase 6)

## Executive verdict

**PASS.** Cleopatra authors win presentation exclusively through the engine-owned Win Presentation Intent API. Local low-level WinViz / `TemplateWinPresentationConfig` DSL is removed. Composition resolves `createClassicLineWinPresentation` at the boundary into `winPresenterConfigOverrides`. Payline theme remains Cleopatra-owned via `winPresentationLineStyles`.

**No SL-Engine runtime, WinViz runtime, loader runtime, starter template, or old module runtime files were changed.**

## Files changed

| File | Change |
|------|--------|
| `src/config/templateGameConfig.ts` | Removed `TemplateWinPresentationConfig`; added `cleopatraWinPresentationTheme`, `cleopatraWinPresentationIntent`, `winPresentationLineStyles` |
| `src/config/composeWinPresentationOverrides.ts` | **New** — intent → `winPresenterConfigOverrides` at composition boundary |
| `src/config/composeEngineGameDefinition.ts` | Uses compose helper; exports `isAuthoredWinPresenterOverrides` |
| `src/main.ts` | Custom game scene gate uses `isAuthoredWinPresenterOverrides`; deep win probe via `?slWinVizDeepProbe=1` only |
| `src/config/slotConfig.ts` | Asset-truth allowlist `SYMBOLS_WITHOUT_DISTINCT_WIN_CLIP` (idle-only clips documented; no symbol/spin-feel behavior changes) |
| `src/config/winPresentationOverrideExample.ts` | Teaches intent + compose path (no low-level visualizer/choreography) |
| `tools/local/pipeline/templateConfigValidate.ts` | Rejects legacy keys + module runtime fields; validates intent via engine; strict spinFeel overrides |
| `tools/local/pipeline/symbolWinClipValidate.ts` | Asset/idle-only clip audit |
| `tools/local/runtime-surfaces/slotConfigSurface.ts` | **Deleted** — unused regex preset helpers |

## Local types removed

- `TemplateWinPresentationConfig` (full low-level WinViz DSL surface)
- Implicit unions for `loopPolicy`, choreography sequence, symbol overlay, amount tween, visualizer lifetime, etc.

## Engine APIs consumed

- `defineWinPresentationTheme`
- `createClassicLineWinPresentation`
- `validateWinPresentationIntent` (doctor / `templateConfigValidate.ts`)
- `ClassicLineWinPresentationOptions`
- `LineStyleRegistryConfig` (payline theme typing via `@view/win/line-style`)

## What stayed Cleopatra-owned (unchanged behavior)

- Theme tokens (`cleopatraWinPresentationTheme`)
- Payline / label styling (`winPresentationLineStyles`)
- Reels, paylines, paytable, symbol catalog, spin feel timings, layout, HUD, demo scenarios, assets
- Symbol `animationSpeed` (0.45) and spin `postStopHoldMs` (0) — not modified by this migration

## What remains an asset limitation

All reel symbols map `winStart` → `idle` in `slotConfig.ts` (`SYMBOLS_WITHOUT_DISTINCT_WIN_CLIP`). First-loop win visibility relies on engine `clipWithOverlay` symbol feedback and stock overlay layers — not distinct win clips. This phase did not add win clips or tune symbol sheets.

## Commands run

```bash
# SL-Engine
pnpm build:sdk

# Cleopatra
pnpm install
pnpm typecheck   # pass
pnpm build       # pass
```

## Grep proof

```bash
rg "TemplateWinPresentationConfig|TemplateWinVisualizerConfig" src tools
# no matches

rg "moduleOrder|enabledModules|additionalWinModules|visualizer\.modules|presentation\.module" src tools
# no active config hits

rg "choreography|loopPolicy|symbolWins|amountTween" src/config
# only composition boundary forward of engine profile + HUD/frame overlay layer names

rg "createClassicLineWinPresentation|defineWinPresentationTheme|validateWinPresentationIntent" src tools
# active usage
```

## Behavioral notes

- Intent preset: `balanced` + `clipWithOverlay` + `payline` + `countUp`.
- Engine resolves choreography `['all', 'each', 'all']` and stock overlay layers; Cleopatra does not author `stepTiming`, `loopPolicy`, or graphic overlay pulse objects.
- Removed template keys fail fast in doctor (`winPresentation`, `winVisualizer`, legacy module fields, dead spinFeel flat keys) — no migration shims.
- Theme tokens are forward-intent (validated; not yet mapped to runtime profile output — Phase 4 engine limitation).

## Commit message

```
refactor(cleopatra): consume engine win presentation intent api
```
