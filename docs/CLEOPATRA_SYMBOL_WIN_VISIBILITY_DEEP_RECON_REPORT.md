# Cleopatra Symbol Win Visibility Deep Recon Report

## 1. Executive Verdict
MIXED (primary Cleopatra visual-asset/config intensity limitation; engine first-loop path is firing and not prematurely cleared in available evidence).

## 2. Dependency Freshness
- SL-Engine commands passed: `pnpm typecheck`, `pnpm build:sdk`, `pnpm check:determinism`, `pnpm check:internal-imports`, `pnpm check:architecture-closure`.
- Cleopatra commands passed: `pnpm install`, `pnpm typecheck`, `pnpm build`.
- Cleopatra dependency points to local SDK: `@fnx/sl-engine: file:../SL-Engine` in `Cleopatra/package.json`.
- Installed package version: `Cleopatra/node_modules/@fnx/sl-engine/package.json` -> `2.0.0`.
- Dist timestamps in Cleopatra install are current (`2026-05-28 15:41`), aligned with current local SDK build.
- Freshness status: **FRESH**.
- Duplicate package risk: **DUPLICATE_PACKAGE_RISK (low)** because sibling/vendored copies can exist in monorepo reality, but active dependency points to `file:../SL-Engine`.

## 3. Scenario Matrix
Derived from `src/game/DemoResultSource.ts` deterministic script for lines mode:

| Scenario | Script slot | totalWin shape | totalBet | multiplier shape | first visual step kind | first step durationMs | first-step symbol targets | first-step lineWins | note |
|---|---:|---|---:|---|---|---:|---|---:|---|
| LOW / normal line win (`smallLineWin`) | 2, 8 | low (example probe: `0.5`) | 1 | low | all | 2400 | 3 | 1 | visibly weakest |
| MEDIUM line win (`mediumLineWin`) | 4 | medium | 1 | medium | all | 2400 | 4 | 1 | more target cells |
| EPIC / high (`fiveOfKind`) | 7 | high | 1 | high | all | 2400 | 5 | 1 | strong symbol footprint |
| Multi-line (`multiLineWin`) | 5 | medium-high | 1 | grouped | all | 2400 | >=3 | 3 | more lines + overlays |
| Big multi-line (`bigMultiLineWin`) | 10 | high | 1 | high | all | 2400 | >=5 groups | 5 | strongest contextual intensity |
| No-win control (`dead`) | 1, 3, 6, 9 | 0 | 1 | 0 | n/a | n/a | 0 | 0 | control |
| Scatter/bonus expected symbol-win | n/a in first-loop deterministic smoke proof | unknown | 1 | unknown | unknown | unknown | unknown | unknown | **UNKNOWN in this run** |

Tier/profile resolution evidence:
- No Cleopatra split tier authoring detected in template win presentation; effective tier is the default resolved profile for low and epic in this configuration surface.

## 4. Cleopatra Config Comparison
Inspected files:
- `src/config/templateGameConfig.ts`
- `src/config/slotConfig.ts`
- `src/game/DemoResultSource.ts`

Low vs epic config path:
- Same choreography surface:
  - `sequence: ['all', 'each']`, `repeat.policy: 'once'`
  - `render.symbols: true`, `render.overlays: true`, `render.lines: 'whenAvailable'`
  - step timing: `allWinsDurationMs: 2400`, `individualWinDurationMs: 5000`, `betweenStepsDelayMs: 500`
- Same symbol win settings:
  - `animation.animationKey: 'winStart'`
  - `animation.loopPolicy: 'step'`
  - `overlay.enabled: true`, `alpha: 0.4`, pulse enabled (`alpha: 0.45`)
- No low-tier vs epic-tier presentation split found in current config.

Conclusion: **no tier/profile mismatch evidence** in Cleopatra config for low vs epic.

## 5. Asset Truth
From `src/config/slotConfig.ts`, `assets/manifest.json`, and `assets/Symbols/*.json`:
- All symbols are `displayType: animatedSprite`.
- All symbol mappings set `idle`, `winStart`, and `winEnd` to `idle`.
- Symbol sheets expose `idle` timeline only for all checked symbols.
- Therefore:
  - `winStart exists as request key`: yes (config-level request).
  - distinct win clip exists in sheets: **no**.
  - `winStart aliases idle`: **true** for all symbols.

Asset classification: **CLEOPATRA_STATIC_WIN_CLIP** (confirmed).

## 6. Low-Win Runtime Probe
Artifacts:
- `docs/probes/CLEOPATRA_LOW_WIN_WINVIZ_DEEP_PROBE.json`
- `../SL-Engine/docs/internal/probes/CLEOPATRA_LOW_WIN_WINVIZ_DEEP_PROBE.json`
- Supporting prior aligned runtime artifact: `../SL-Engine/docs/internal/probes/CLEOPATRA_WINVIZ_FIRST_LOOP_ALIGNMENT_PROBE.json`

Observed low first-loop facts:
- `onWinStart` called for target cells.
- `requestedAnimationKey = winStart`, `resolvedAnimationKey = idle`, `aliasesIdle = true`.
- Layer runtime events present: `playStep`, `play(symbolHighlight/payline/amount)`, then `clearStep`, then `clearPresentation`.
- No evidence of clear occurring before first step render path.

## 7. Epic-Win Runtime Probe
Artifacts:
- `docs/probes/CLEOPATRA_EPIC_WIN_WINVIZ_DEEP_PROBE.json`
- `../SL-Engine/docs/internal/probes/CLEOPATRA_EPIC_WIN_WINVIZ_DEEP_PROBE.json`

Status:
- Scenario is deterministic and classified from `DemoResultSource` (`fiveOfKind` / `bigMultiLineWin` slots).
- Direct epic browser first-loop event payload was **not captured in this run** due unavailable browser automation module in this workspace session.
- Therefore epic runtime section is **partially inferred** from deterministic script + config parity, not fully instrumented like low.

## 8. Low vs Epic Comparison
| Field | Low win | Epic win | Difference | Root-cause relevance |
|---|---|---|---|---|
| resolved tier | default | default | none | rules out `CLEOPATRA_TIER_CONFIG_MISMATCH` |
| target count | 3 | expected 5+ (five-of-kind / big-multi) | epic higher | stronger visual footprint |
| step duration | 2400 | 2400 | none | not clear-timing driven |
| overlay alpha | 0.4 | 0.4 | none | same overlay config |
| overlay scale/pulse policy | same policy | same policy | none | same authored intensity controls |
| line count | 1 | 1 or multi | epic can be multi-line | adds visual context in epic |
| amount text intensity | low amount | higher amount | epic stronger numeric cue | perceived intensity gap |
| onWinStart count | 3 (observed) | expected >=3, often more | epic likely higher | more symbols highlighted |
| overlay visible count | 3 enabled (observed) | expected higher count | epic broader coverage | stronger readability |
| aliasesIdle count | all winning symbols alias idle | same expected | none | core static-clip limitation |
| clear timing | post-play (observed) | expected same timing model | none | weak evidence for early clear |
| frame visibility | no 5-frame capture available | no 5-frame capture available | unknown both | residual uncertainty |

## 9. Hook Truth
- `onWinStart` hook: **FIRING** (proven in low runtime evidence).
- `StepSymbolWinController.startPositions`: **FIRING** (proven in low runtime evidence).
- `SymbolHighlightLayerRenderer.play`: **FIRING** (proven in low runtime evidence).
- Hook firing breakpoint classification: not `ENGINE_HOOK_NOT_FIRING`.

## 10. Display Instance Truth
- Available evidence shows hooked displays are visible (`visible: true`, parent present, alpha 1).
- Explicit instance-id equality (`target instance id == currently visible instance id`) is not present in captured schema.
- Classification status: no positive evidence for `ENGINE_STALE_DISPLAY_INSTANCE`; residual uncertainty remains because explicit id-pair fields are absent.

## 11. Overlay Visibility Truth
- Overlay is configured and enabled in Cleopatra config.
- Runtime path indicates symbol highlight/overlay layers play on low first-loop.
- No hard evidence in this run for mask/z-order invisibility failure.
- No hard evidence that overlay is absent.
- Practical perception remains weak for low due idle-alias symbols + fewer targets.

## 12. Frame Timing Truth
- Low probe shows `clearStep` after first step play events, not before.
- No evidence supporting `ENGINE_CLEAR_TOO_EARLY` from available low evidence.
- Required first 5-frame sampling fields are not currently present in captured payload -> **UNKNOWN** at per-frame granularity.

## 13. Root Cause Classification
Primary:
- **CLEOPATRA_STATIC_WIN_CLIP**

Secondary:
- **CLEOPATRA_LOW_WIN_OVERLAY_TOO_WEAK** (contextual/perceptual weakness at low target counts despite overlay enabled)

Not supported by available evidence:
- `ENGINE_HOOK_NOT_FIRING`
- `ENGINE_WRONG_TIER_PROFILE`
- `ENGINE_CLEAR_TOO_EARLY` (at macro lifecycle level)
- `ENGINE_OVERLAY_NOT_CREATED`

Overall classification: **MIXED** (Cleopatra static clip + low-intensity perception gap).

## 14. Recommended Fix Plan
Recon-only plan (no fixes implemented):
1. Keep current engine path and migration state unchanged.
2. Introduce distinct Cleopatra win clip(s) for at least key symbols, keep `animationKey: winStart`.
3. Preserve `loopPolicy: step` and current choreography contracts.
4. Add a deterministic epic and low browser probe capture with explicit per-frame overlay/sample fields.
5. If assets remain idle-only, increase low-tier visual authority explicitly (overlay/text/line emphasis), but document this as intentional fallback.

## 15. Tests Required For Fix
1. Cleopatra browser deterministic low scenario: assert `onWinStart` fired and first 5 frames include visible symbol/overlay state.
2. Cleopatra browser deterministic epic scenario: same assertions and compare intensity metrics against low.
3. Asset contract test: fail when configured `winStart` resolves to idle for symbols that are expected to animate distinctly.
4. Probe schema test: enforce presence of display instance identity + overlay visibility/mask/z metrics.
5. Regression test: no direct `SPINNING -> WIN`, no module-runtime reintroduction.

## 16. Commands Run
- `cd /Volumes/BackupMac/Personal/SL-Engine && pnpm typecheck && pnpm build:sdk && pnpm check:determinism && pnpm check:internal-imports && pnpm check:architecture-closure`
- `cd /Volumes/BackupMac/Personal/Cleopatra && pnpm install && pnpm typecheck && pnpm build`
- `ls -l "node_modules/@fnx/sl-engine/dist" && ls -l "node_modules/@fnx/sl-engine/dist/testing"`
- `rg "moduleOrder|enabledModules|additionalWinModules|visualizer\\.modules|presentation\\.module|WinVisualizerCore|HighlightModule|LinePathModule|WinTextModule|JackpotModule|IWinVisualModule|loopPolicy|symbolWins|overlay|winStart|idle" /Volumes/BackupMac/Personal/Cleopatra`
- `rg "WinVisualizerCore|HighlightModule|WinTextModule|LinePathModule|JackpotModule|SPINNING.*WIN|WIN.*SPINNING|setTimeout|delay" /Volumes/BackupMac/Personal/SL-Engine`
- `rg "slWinVizDeepProbe|WinVizDeepProbe|SymbolWinFirstCycleTraceProbe|WinOverlayLayerRuntimeProbe" /Volumes/BackupMac/Personal/SL-Engine`
- Attempted (failed due missing module): browser automation capture using `playwright` from shell.

## 17. Grep Proof
- Cleopatra grep shows no active legacy module runtime config fields in active source.
- SL-Engine grep confirms old module runtime symbols are absent from active runtime path; matches are governance/docs/tests.
- Transition guard grep supports no illegal direct transition implementation in active runtime surface.

## 18. Future Commit Message
`recon(cleopatra): classify first-loop symbol visibility gap as static win clip plus low-intensity perception`
