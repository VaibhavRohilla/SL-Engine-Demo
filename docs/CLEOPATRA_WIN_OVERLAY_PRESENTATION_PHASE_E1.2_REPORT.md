# Cleopatra Win Overlay Presentation — Phase E1.2 Report

## 1. Executive Verdict

**PASS** (Phase E1.2 consumer proof, 2026-05-29).

Cleopatra is the canonical production consumer of `winPresentationIntent.winOverlay` with `amountText: 'none'`. The removed transitional `winText` composition path is not used. Tier-scoped dynamic overlays (normal → epic) resolve to the internal `winOverlay` overlay layer only — no stock `amountText` layer, no third `winText` branch.

Engine authority sealed in E1.1: [`WIN_OVERLAY_SINGLE_AUTHORITY_CONSOLIDATION_REPORT.md`](../../SL-Engine/docs/internal/WIN_OVERLAY_SINGLE_AUTHORITY_CONSOLIDATION_REPORT.md).

## 2. Scope

Phase E1.2 proves the **consumer boundary** only:

- Cleopatra template intent uses `winOverlay`, not removed `winText`
- Composition boundary (`composeWinPresentationOverrides`) maps intent-owned overlay layers onto tiers
- Tier step timings fit winOverlay rule durations (no `WIN_OVERLAY_STEP_LAYER_TOO_LONG`)
- Mega/epic celebrations use title + amount parallel tracks
- Text-only composition (no sprite asset dependencies in E1.2 proof)

Out of scope: E2 `animatedSprite`, panel/sprite visual polish, browser screenshot proof.

## 3. Authority Model (Cleopatra)

```ts
winPresentationIntent: {
  amountText: 'none',
  winOverlay: cleopatraWinOverlayPresentation,
}
```

Resolved profile layers:

```text
symbolHighlight | payline | winOverlay
(no amountText)
```

## 4. Files

| File | Role |
|---|---|
| `src/config/templateGameConfig.ts` | Authors `amountText: 'none'` + `winOverlay` + tier step timings |
| `src/config/cleopatraWinOverlayPresentation.ts` | Tier-scoped winOverlay composition rules |
| `src/config/composeWinPresentationOverrides.ts` | Maps intent profile via `createClassicLineWinPresentation` + overlay layer cutover |
| `tools/local/pipeline/cleopatraWinOverlayValidate.ts` | Doctor/CLI E1.2 proof validator |
| `tools/validate-win-overlay.ts` | Standalone CLI entry |

Removed:

- `src/config/cleopatraWinTextPresentation.ts` (deleted in E1.1 migration)

## 5. E1.2 Checklist

| Criterion | Result |
|---|---|
| Uses `winOverlay`, not `winText` | **PASS** |
| `amountText: 'none'` when winOverlay active | **PASS** |
| normal / good / big / mega / epic overlays authored | **PASS** |
| Mega/epic title + amount elements | **PASS** |
| No `amountText` layer in resolved profile | **PASS** |
| No `WIN_OVERLAY_STEP_LAYER_TOO_LONG` (duration cross-check) | **PASS** |
| No missing sprite asset errors | **PASS** (text-only E1.2 proof) |
| Skip/clear/destroy lifecycle leaks | **Engine-covered** (`WinOverlayCompositionLayerRenderer` tests); Cleopatra uses standard compose path |

## 6. Tier Duration Proof

Parallel-track duration = max track sum. All tiers fit `individualWinDurationMs`:

| Tier | Overlay duration (ms) | Step timing (ms) | Margin |
|---|---|---|---|
| normal | 5220 | 5300 | 80 |
| good | 7420 | 7500 | 80 |
| big | 10220 | 10300 | 80 |
| mega | 13650 | 13700 | 50 |
| epic | 17000 | 17000 | 0 |

## 7. Commands Run

Cleopatra:

- `pnpm typecheck` — pass
- `pnpm validate:win-overlay` — pass
- `pnpm doctor` — pass (includes E1.2 win overlay proof step)

SL-Engine (optional sibling checkout):

- `pnpm exec vitest run tests/config/cleopatraWinOverlayPhaseE12.test.ts` — pass when `../Cleopatra` present

## 8. Remaining Phases

- **E2** — `animatedSprite` overlay element + Cleopatra panel/sprite visual polish
- Optional browser visual proof harness for mega/epic tier wins
- Public `docs/reference/` winOverlay authoring guide

## 9. Commit Message

`proof(cleopatra): add winOverlay E1.2 consumer validation and report`
