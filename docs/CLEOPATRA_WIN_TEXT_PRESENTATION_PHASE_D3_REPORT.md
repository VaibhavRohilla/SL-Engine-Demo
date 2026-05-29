# Cleopatra Win Text Presentation Phase D3 Report

## Executive verdict

**PASS.** Cleopatra is the first production consumer of intent-level `winPresentationIntent.winText` with `amountText: 'none'`, dynamic timelines for default/mega/epic tiers, and composition-time overlay layer cutover onto stock tiers.

## Scope

1. `amountText: 'none'` — single text authority via winText overlay.
2. `cleopatraWinTextPresentation` — default amount timeline + mega/epic title/amount parallel tracks.
3. Command-level `emit` on countTo / to completion (proof events only; no custom hooks).
4. `text` elements only (no bitmap fonts in manifest).
5. Engine `applyWinPresentationOverlayLayersToTiers` — maps intent overlay layers onto catalog tiers (required for runtime).

## Composition boundary

`composeWinPresenterConfigOverrides` now:

- Resolves `createClassicLineWinPresentation(intent)`.
- Applies timing intent to tiers when authored.
- When profile includes a `winText` overlay layer, replaces each tier's `presentation.overlay` preset with intent-resolved layers (removes stock `amountText` preset path).

## Tier timing alignment

Win text timeline durations drive step timing:

| Tier | Max track duration | `individualWinDurationMs` |
|------|-------------------|---------------------------|
| default | 920ms | 1000 |
| mega | 1750ms | 1800 |
| epic | 1900ms | 2000 |

## Emit events (observability)

| Event | When |
|-------|------|
| `amountCountComplete` | Default tier countTo completes |
| `megaTitleSettled` | Mega title settle tween completes |
| `megaAmountCountComplete` | Mega amount countTo completes |
| `epicTitleSettled` | Epic title settle tween completes |
| `epicAmountCountComplete` | Epic amount countTo completes |

Subscribe via presenter-owned `WinTextEventBridge` when a public host port is added; events are data-only.

## Files changed

**Cleopatra**

- `src/config/cleopatraWinTextPresentation.ts` (new)
- `src/config/templateGameConfig.ts`
- `src/config/composeWinPresentationOverrides.ts`
- `docs/CLEOPATRA_WIN_TEXT_PRESENTATION_PHASE_D3_REPORT.md` (this file)

**SL-Engine**

- `src/sdk/template-intent/applyWinPresentationOverlayLayersToTiers.ts` (new)
- `src/sdk/template-intent/index.ts`
- `tests/config/applyWinPresentationOverlayLayersToTiers.test.ts` (new)
- `tests/config/templateIntentBoundary.ts`

## Non-goals

- Custom hook registry / host FX routing.
- Bitmap font assets (`fontKey`) — add manifest fonts before switching mega/epic to `bitmapText`.
- Sprite / animatedSprite timeline elements.

## Commit message

`refactor(cleopatra): consume dynamic win text presentation intent`
