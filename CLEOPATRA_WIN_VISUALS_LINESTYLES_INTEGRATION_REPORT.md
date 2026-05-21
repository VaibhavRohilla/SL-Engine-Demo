# Cleopatra — Win Choreography + Canonical LineStyles Integration

**Phase:** Cleopatra — Win Choreography + Canonical LineStyles Integration  
**Date:** 2026-05-15  
**Engine dependency:** `@fnx/sl-engine` via `file:../SL-Engine` (WV-1–WV-5 release-gated build)

---

## 10.1 Executive verdict

**PASS (config + build)** — **runtime visuals require re-check after yOffset / line-reveal fix**

Cleopatra is wired to the WV-5 win visual contract. Boot/mount succeeds after fixing `byLineId` label partials. Typecheck and build pass. No SL-Engine files were modified.

**Post-integration runtime fix (2026-05-15):** Win text was authored with `textPosition.yOffset: 260`, which moves the banner **down** from reel center (Pixi +Y) into the HUD / below the reel mask — matches “symbols only” symptom for win amount. Corrected to `yOffset: 0`. Default line `reveal` set to `instant` / `enabled: false` so paylines draw synchronously during WV-3 steps (timeline reveal was deferred until batch `planner.play()`).

---

## 10.2 Files changed

| Path | Purpose | Change type |
|------|---------|-------------|
| `src/config/templateGameConfig.ts` | WV-5 `TemplateWinPresentationConfig` + authored `winPresentation` | Replace interface + config |
| `src/config/composeEngineGameDefinition.ts` | `isAuthoredWinPresentationTemplate` for `lineStyles` / `choreography` | Update detection |
| `tools/local/pipeline/templateConfigValidate.ts` | Doctor validation for WV-5; reject removed keys | Replace win-presentation validation |
| `src/config/winVisualizerOverrideExample.ts` | Advanced scene example | Migrate to WV-5 |

**Unchanged (verified sufficient):**

| Path | Notes |
|------|-------|
| `src/game/DemoResultSource.ts` | Already cycles single-line, multi-line (3 and 5 lines), totals |
| `src/config/slotConfig.ts` | Paylines `id` 1–10 for `byLineId` style proof |
| `src/main.ts` | Passes `winPresenterConfigOverrides` through stock game scene factory |

---

## 10.3 Final config

Relevant `winPresentation` block (see `src/config/templateGameConfig.ts`):

```ts
winPresentation: {
  timingPrecedence: 'presenterOverridesTier',
  textPosition: { yOffset: 0 },
  timing: {
    singleWinDurationMs: 1200,
    betweenWinsDelayMs: 150,
    allWinsDurationMs: 1800,
  },
  global: {
    showPaylines: true,
    showWinHighlight: false,
  },
  visualizer: {
    executionMode: 'parallel',
    lifetime: { durationPolicy: 'untilNextSpin' },
    symbolWins: {
      enabled: true,
      animation: { enabled: true, animationKey: 'winStart', loopPolicy: 'presentation' },
      overlay: { enabled: true, type: 'graphic', lifetime: 'followPresentation' },
    },
    lines: { enabled: true, lifetime: 'followStep' },
    winText: { enabled: true, lifetime: 'followStep' },
    linePresentationMode: 'vector',
  },
  choreography: {
    enabled: true,
    sequence: ['all', 'each', 'all'],
    repeat: { policy: 'untilNextSpin' },
    singleGroupBehavior: 'collapseToEach',
    stepTiming: {
      allWinsDurationMs: 1800,
      individualWinDurationMs: 1200,
      betweenStepsDelayMs: 150,
    },
    amount: { allStep: 'total', individualStep: 'group' },
    render: {
      symbols: true,
      lines: 'whenAvailable',
      winText: true,
      overlays: true,
    },
  },
  lineStyles: {
    default: {
      line: {
        type: 'graphic',
        color: 0xffd700,
        width: 5,
        alpha: 1,
        reveal: { mode: 'fromLineStart', enabled: true, durationMs: 280 },
        glow: { enabled: true, color: 0xfff1a8, width: 8, alpha: 0.55 },
      },
      label: {
        enabled: true,
        position: 'start',
        background: {
          type: 'graphic',
          fill: 0x3a1a00,
          alpha: 0.95,
          stroke: 0xffd700,
          strokeWidth: 2,
          radius: 12,
          paddingX: 8,
          paddingY: 5,
        },
        text: {
          enabled: true,
          valueMode: 'lineId',
          fontSize: 15,
          fill: 0xffffff,
          stroke: 0x000000,
          strokeWidth: 2,
        },
      },
    },
    byLineId: {
      '1': { line: { color: 0xff3b30 }, label: { enabled: true, background: { type: 'graphic', fill: 0xff3b30, stroke: 0xffffff }, text: { enabled: true, valueMode: 'lineId', fill: 0xffffff } } },
      '2': { line: { color: 0x007aff }, label: { enabled: true, background: { type: 'graphic', fill: 0x007aff, stroke: 0xffffff }, text: { enabled: true, valueMode: 'lineId', fill: 0xffffff } } },
      '3': { line: { color: 0x34c759 }, label: { enabled: true, background: { type: 'graphic', fill: 0x34c759, stroke: 0xffffff }, text: { enabled: true, valueMode: 'lineId', fill: 0xffffff } } },
      '4': { line: { color: 0xffcc00 }, label: { enabled: true, background: { type: 'graphic', fill: 0xffcc00, stroke: 0x000000 }, text: { enabled: true, valueMode: 'lineId', fill: 0x000000, stroke: 0xffffff } } },
      '5': { line: { color: 0xaf52de }, label: { enabled: true, background: { type: 'graphic', fill: 0xaf52de, stroke: 0xffffff }, text: { enabled: true, valueMode: 'lineId', fill: 0xffffff } } },
    },
  },
},
```

**Note:** Symbol overlay uses `followPresentation` (not `followStep`) because engine `SymbolWinOverlayLifetime` does not include `followStep`. Lines and win text use `followStep` as specified.

---

## 10.4 Config-flow proof

```
templateGameConfig.winPresentation
  → composeEngineGameDefinition()
      → materializeWinPresentationOverridesForEngine()  // strips showWinHighlight alias
      → StarterGameDefinition.winPresenterConfigOverrides
  → main.ts createGameSceneWithWinPresentation()
      → SlotGameScene.fromContext({ slotSceneConfigOverrides: { winPresenterConfigOverrides } })
  → engine mergeWinPresenterFullConfig / assertFinalizedWinPresenterConfig
      → WinPresenter runtime
```

| Field | Status |
|-------|--------|
| `choreography` | **WIRED** |
| `lineStyles` | **WIRED** |
| `paylineStyle` | **REMOVED** |
| `global.showLineLabels` | **REMOVED** |
| `paylineStyle.showLineLabel` | **REMOVED** |
| `global.winLoopLimit` / `visualizer.loopEnabled` | **REMOVED** (replaced by `choreography.repeat`) |

---

## 10.5 Original bug closure

| Bug | Old behavior | New behavior | Proof |
|-----|--------------|--------------|-------|
| Multiple wins did not cycle properly | Legacy timing / no choreography | `choreography.enabled: true`, sequence `['all','each','all']`, `repeat.untilNextSpin` | Config wired; demo script includes `multiLineWin` / `bigMultiLineWin` |
| Line colors not configurable | Single `paylineStyle.color` | `lineStyles.default` + `lineStyles.byLineId` per line | Config + engine `resolvePaylineStyle` |
| Labels primitive / not configured | `showLineLabels: false`, no label API | `lineStyles.default.label` + per-line overrides, `valueMode: 'lineId'` | Config + validator |
| Line/win amount missing or wrong | Tier timing only | `choreography.amount`: `allStep: 'total'`, `individualStep: 'group'` | Config wired |
| Cleanup residue risk | `followPresentation` only | `lines` / `winText` `followStep`; session `untilNextSpin` | Config wired |
| **Mount failure (found in QA)** | Partial `byLineId.label` without `enabled` | Full label stubs per line (`enabled`, `background.type`, `text.enabled`) | Browser boot → game scene loads |

---

## 10.6 Visual tuning notes

| Area | Choice | Rationale |
|------|--------|-----------|
| Choreography sequence | `all → each → all` | Standard multi-win showcase; `collapseToEach` avoids duplicate all-steps on single wins |
| Step timing | 1800 / 1200 / 150 ms | Readable Cleopatra frame; not over-tuned before artist pass |
| Default line | Gold `0xffd700`, width 5, reveal 280ms | High contrast on Egyptian frame |
| Per-line colors | Red/blue/green/yellow/purple for lines 1–5 | Distinct style proof on multi-line demo spins |
| Labels | `lineId` at line start, graphic pill background | Canonical WV-5 label API |
| Overlay | Graphic, `followPresentation` | Engine overlay lifetime contract |

---

## 10.7 Commands run

| Command | Result | Notes |
|---------|--------|-------|
| `cd SL-Engine && pnpm build:sdk` | PASS | Fresh dist for local `file:../SL-Engine` |
| `cd Cleopatra && pnpm typecheck` | PASS | After `byLineId` label fix |
| `cd Cleopatra && pnpm build` | PASS | `dist/` produced |
| `cd Cleopatra && pnpm doctor` | PARTIAL | Template config step clean; pre-existing audio/SDK vendoring errors unrelated to win visuals |
| `cd Cleopatra && pnpm dev` | PASS | Served on `http://localhost:8083/` |

---

## 10.8 Manual/browser proof

| Check | Device / URL | Result |
|-------|----------------|--------|
| Boot → Tap to Play → game scene | Chrome, `http://localhost:8083/` | **PASS** after `byLineId` label fix (was **FAIL** with `assertFinalizedWinPresenterConfig`) |
| Console on mount | Same | No `assertFinalizedWinPresenterConfig` errors after fix |
| Multi-win choreography (all/each/all) | — | **Pending manual spin** — spin until `multiLineWin` scenario (spin 5, 10 in demo script) |
| Per-line colors + labels | — | **Pending manual spin** on line win |
| Next-spin cleanup | — | **Pending manual** — spin during active presentation |
| Single-win collapse | — | **Pending manual** — `smallLineWin` scenario |

**Demo scenario rhythm** (`DemoResultSource` line script): dead → small → dead → medium → **multiLine (3 lines)** → dead → fiveOfKind → … → **bigMultiLine (5 lines)**.

---

## 10.9 Remaining issues

**Acceptable:**

- Final artist color/spacing pass on labels and lines
- HUD/paytable polish, sound assets (doctor audio key warnings pre-exist)
- Symbol overlay `followStep` deferred — engine only supports `followPresentation` for overlays
- Full choreography/label visual checklist requires manual spins (automated canvas proof not in repo)

**Not acceptable (resolved or N/A):**

- ~~Old `paylineStyle` / `showLineLabels` in Cleopatra src~~ — removed
- ~~Boot mount failure on lineStyles~~ — fixed with explicit `label.enabled` / `text.enabled` on `byLineId` entries
- No SL-Engine changes required — not an engine regression

---

## Critical fix: `byLineId` partial labels

**Error observed:**

```
assertFinalizedWinPresenterConfig: lineStyles.byLineId.1.label.enabled must be boolean.
```

**Cause:** Engine validates each `byLineId` entry **before** merging with `default`. Partial `label: { background, text }` without `enabled: true` fails fast.

**Fix:** Each `byLineId` label override must include:

- `label.enabled: true`
- `label.background.type: 'graphic'` (when background is set)
- `label.text.enabled: true` and `label.text.valueMode: 'lineId'` (when text is set)

Doctor validator updated to catch this at template-config time.
