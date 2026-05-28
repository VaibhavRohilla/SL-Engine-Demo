# Cleopatra Low-Win Symbol Visibility Report

## Executive Verdict
PASS (Cleopatra-side low-win visibility improved within current idle-only asset constraints).

- Engine first-cycle hook path remains healthy.
- Primary cause remains `CLEOPATRA_STATIC_WIN_CLIP` (no distinct win clips in symbol sheets).
- Secondary cause `LOW_WIN_PRESENTATION_INTENSITY_GAP` addressed with stronger overlay profile for low/normal first-loop readability.

## Asset Inventory

| Symbol | Asset key | Available animation keys | Current idle | Current winStart | Real win clip available? | Decision |
|---|---|---|---|---|---|---|
| 10 | `Symbols/10` | `idle` | `idle` | `idle` | no | IDLE_ONLY_ASSET |
| J | `Symbols/J` | `idle` | `idle` | `idle` | no | IDLE_ONLY_ASSET |
| Q | `Symbols/Q` | `idle` | `idle` | `idle` | no | IDLE_ONLY_ASSET |
| K | `Symbols/k` | `idle` | `idle` | `idle` | no | IDLE_ONLY_ASSET |
| A | `Symbols/A` | `idle` | `idle` | `idle` | no | IDLE_ONLY_ASSET |
| Ankh | `Symbols/Ankh` | `idle` | `idle` | `idle` | no | IDLE_ONLY_ASSET |
| Eye | `Symbols/Eye` | `idle` | `idle` | `idle` | no | IDLE_ONLY_ASSET |
| Lotus | `Symbols/Lotus` | `idle` | `idle` | `idle` | no | IDLE_ONLY_ASSET |
| Shen | `Symbols/Shen` | `idle` | `idle` | `idle` | no | IDLE_ONLY_ASSET |
| Wick | `Symbols/Wick` | `idle` | `idle` | `idle` | no | IDLE_ONLY_ASSET |
| Wild | `Symbols/Wild` | `idle` | `idle` | `idle` | no | IDLE_ONLY_ASSET |
| Scatter | `Symbols/Scatter` | `idle` | `idle` | `idle` | no | IDLE_ONLY_ASSET |
| Bonus | `Symbols/Bonus` | `idle` | `idle` | `idle` | no | IDLE_ONLY_ASSET |
| FreeSpin | `Symbols/FreeSpin` | `idle` | `idle` | `idle` | no | IDLE_ONLY_ASSET |
| Jackpot | `Symbols/Jackpot` | `idle` | `idle` | `idle` | no | IDLE_ONLY_ASSET |

All symbols are currently `IDLE_ONLY_ASSET`.

## Low vs Epic Comparison (Root-Cause Context)
- Low/normal wins typically involve fewer winning cells and smaller aggregate emphasis (line + amount + overlay footprint).
- High/epic wins often have more winning cells and stronger aggregate visual context.
- Both paths use the same engine flow (`onWinStart` first loop). The difference is presentation intensity, not a different engine route.
- With `winStart -> idle`, low wins are most affected by weak visibility.

## Mappings Changed
- No symbol `winStart` remap to a distinct clip was possible (no real clips in sheets).
- Kept truthful mapping in `src/config/slotConfig.ts`.
- Explicit idle-only allowlist preserved in `SYMBOLS_WITHOUT_DISTINCT_WIN_CLIP`.

## Overlay Tuning Changed
Updated `src/config/templateGameConfig.ts` for clearer low-win first-loop signal:

- `symbolWins.overlay.alpha`: `0.32 -> 0.4`
- `symbolWins.overlay.stroke.width`: `3 -> 4`
- `symbolWins.overlay.paddingPx`: `5 -> 6`
- `symbolWins.overlay.pulse.alpha`: `0.36 -> 0.45`
- `symbolWins.overlay.pulse.durationMs`: `600 -> 520`
- Kept:
  - `animationKey: 'winStart'`
  - `loopPolicy: 'step'`
  - no legacy module runtime fields

## Browser Proof
Artifact: `docs/CLEOPATRA_LOW_WIN_SYMBOL_VISIBILITY_PROBE.json`

Deterministic low-win probe (`?slTest=1&slWinSymbolProbe=1&slFirstLoop=1`) confirms:
- `onWinStart` fired on first loop (`displayOnWinStart` entries present).
- `requestedAnimationKey = winStart`.
- `resolvedWinAnimation = idle`, `aliasesIdle = true` (expected for idle-only assets).
- `overlayEnabled = true` for winning symbols.
- Overlay tuning values in active config are reflected in capture metadata (`alpha: 0.4`, pulse enabled/intensified).

Epic proof note:
- Current probe harness requires `slTest=1`, and smoke mode intentionally emits low/no-win rhythm only.
- Epic-tier probe parity needs either:
  1) a probe-enabled non-smoke control path, or
  2) a deterministic scenario selector exposed to browser smoke hook.
- This is a tooling limitation, not a runtime regression.

## Tests Run
- `pnpm typecheck` ✅
- `pnpm build` ✅
- `symbol-win-clip-validate` contract ✅
  - all configured `winStart` clips exist in sheets
  - idle-only symbols explicitly allowlisted
  - `animationKey` remains `winStart`
  - `loopPolicy` remains `step`
  - low-win overlay fallback remains enabled and sufficiently strong
- Deprecated config grep guard ✅
  - no active `moduleOrder`, `enabledModules`, `additionalWinModules`, `visualizer.modules`, `presentation.module`

## Remaining Asset Limitations
- No symbol has a distinct win clip yet.
- True symbol-motion differentiation requires new asset clips (e.g. `win`/`winStart`) per symbol sheet.

## Commit Message
`fix(cleopatra): strengthen low-win symbol overlay visibility`
