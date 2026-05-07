# Testnew

A standalone classic slot starter built on the vendored `@fnx/sl-engine` package. It is meant to be the first codebase for a branded slot: replace the starter art, tune the reel window, wire hooks, run diagnostics, and ship from the generated project without depending on this monorepo.

**Scope:** SL-Engine provides a pilot-ready **generated classic starter baseline for senior developers**: config-driven visuals, typed hooks, validated spin-feel presets, doctor diagnostics, starter-source typecheck in the monorepo, and generator verification for the materialized project. For demos, treat it as a **serious slot starter foundation**, not a complete no-code slot builder—you still edit topology in `slotConfig.ts`, wire your result source, and own art/audio keys.

## First 15 minutes

Linear path after generating or cloning the project:

1. `pnpm install`
2. `pnpm assets`
3. `pnpm run dev`
4. Change the slot background in `src/config/templateGameConfig.ts` (`scenes.slot.background`)
5. Add or change the frame (`scenes.slot.frame`) and matching asset under `assets/`
6. Move or resize the reels (`layout.base.reelWindow` and optional `layout.portrait` / `layout.landscape`)
7. Tune the `commercial-slot` Default HUD under `src/config/hud/` (zones, paytable copy, bet ladder, theme tokens)
8. `pnpm run doctor`
9. `pnpm run build`

## Run

```bash
pnpm install
pnpm assets
pnpm run dev
pnpm run build
pnpm run doctor
```

Scripts:

| Command | Purpose |
|---|---|
| `pnpm install` | Install the vendored engine and local toolchain |
| `pnpm assets` | Generate `assets/manifest.json` and `src/Asset.d.ts`, then validate assets |
| `pnpm run dev` | Start the local dev server |
| `pnpm run build` | Create the production bundle in `dist/` |
| `pnpm run doctor` | Validate starter config, manifest references, loading, and common slot mistakes |
| `pnpm typecheck` | Run TypeScript checks |
| `pnpm clean` | Remove local build and diagnostics outputs |

Optional diagnostics:

```bash
pnpm assets -- --json
pnpm run doctor -- --json
```

## Project Structure

| Path | Purpose |
|---|---|
| `src/config/hud/` | Typed `runtimeShell.hud` (commercial-slot shell: panels, theme, responsive layout) |
| `src/config/starterTotalBetSteps.ts` | Shared total-bet ladder for `slotConfig` and HUD bet panel |
| `src/config/templateGameConfig.ts` | Main branded-slot visual, layout, and spin feel config |
| `src/config/templateHooks.ts` | Starter lifecycle hooks for sound, logging, analytics, and light VFX triggers |
| `src/config/slotConfig.ts` | Symbols, reels, paytable, wild/scatter config, and evaluation mode |
| `src/config/bootConfig.ts` | Asset manifest and boot/start loading groups |
| `src/config/audioConfig.ts` | Audio keys and spin feel audio cue overrides |
| `src/main.ts` | Bootstrap composition only; keep feature logic in config/game files |
| `assets/` | Source assets plus committed generated manifest |
| `tools/local/**` | Starter-local asset, build, dev, and doctor tooling |
| `vendor/sl-engine/**` | Vendored engine runtime |
| `docs/STARTER_CONTRACT.md` | Strict generator and standalone project contract |
| `docs/ASSET_PIPELINE.md` | Asset pipeline details |

## Commercial HUD demo

The generated classic starter opens with the commercial HUD:

```ts
// src/config/hud/hudConfig.ts
preset: 'commercial-slot',
commercial: {
  enabled: true,
  preset: 'commercial-slot',
}
```

The commercial HUD shape is configured in `src/config/hud/hudConfig.ts`:

```ts
preset: 'commercial-slot',
commercial: {
  enabled: true,
  preset: 'commercial-slot',
}
```

Keep the existing `commercial.zones`, `commercial.skin`, `panels`, and `theme` blocks unless your demo profile needs a targeted visual change. Then run:

```bash
pnpm assets
pnpm run doctor
pnpm run dev
```

From the SL-Engine monorepo root, the generated browser proof for commercial control textures is:

```bash
pnpm test:generated -- --commercial-texture-proof
```

That proof mutates only a temporary generated project. It does not flip this starter default, add PNG assets, or create a separate commercial starter variant.

Live commercial controls today: `spin`, `autoplay`, `bet` via `betPanel`, `turbo`, `menu`, `info`, and `sound`. Buy-feature purchase behavior, fullscreen, back, feature rail item clicks, and bottom HUD bar taps are visual-only or disabled in this phase; do not present them as live runtime features.

Deeper docs from the SL-Engine monorepo:

- [`docs/reference/COMMERCIAL_HUD_CONTRACT.md`](../../../../docs/reference/COMMERCIAL_HUD_CONTRACT.md)
- [`docs/reference/HUD_CONFIGURATION.md`](../../../../docs/reference/HUD_CONFIGURATION.md)
- [`docs/buyer-proof/UI_PRESENTATION_PROOF.md`](../../../../docs/buyer-proof/UI_PRESENTATION_PROOF.md)
- [`docs/buyer-proof/GENERATED_PROJECT_PROOF.md`](../../../../docs/buyer-proof/GENERATED_PROJECT_PROOF.md)

## Topology vs visual layout

Avoid mixing **mechanic topology** with **on-screen layout**:

**`src/config/templateGameConfig.ts`** — visual layout and chrome:

- Reel window position (`reelWindow.x`, `reelWindow.y`)
- Reel window size (`width`, `height`)
- Symbol size and spacing (`symbols.width`, `symbols.height`, `gapY`, `reelGap`)
- Rectangular mask (`reelWindow.mask`)
- Portrait / landscape **visual** overrides (`layout.portrait`, `layout.landscape`)

**`src/config/slotConfig.ts`** — slot topology and mechanics:

- `layout.reelCount`, `layout.rowsPerReel`
- Reel strips (`reels.strips`)
- Symbol catalog, paytable, wild/scatter, evaluation mode (`ways`, etc.)

Changing only the template reel window does **not** change how many reels or visible rows the math expects. For a different grid (for example 6×4), update **both** topology in `slotConfig.ts` and the visual window in `templateGameConfig.ts` so they stay consistent.

### Engine layout policy (`rowsPerReel`, generator, gravity)

Admission for reel shapes is **policy-gated** (stock vs flexible), and the public generator only exposes `--layout standard` / `ragged` — exact `rowsPerReel` belongs in `slotConfig.ts`. Gravity **micro-layout** custom configs are out of scope; stage-local geometry churn has an honest “roadmap / not proven in generated smoke” label. Read the authoritative engine document **Layout policy and limitations** in the SL-Engine monorepo: [`docs/reference/LAYOUT_POLICY_AND_LIMITATIONS.md`](../../../../docs/reference/LAYOUT_POLICY_AND_LIMITATIONS.md). (Published `@fnx/sl-engine` tarballs ship README only — use the same path on GitHub.)

## Visual Config

Edit `src/config/templateGameConfig.ts`.

Boot and start backgrounds:

```ts
scenes: {
  boot: { background: { assetKey: 'backgrounds/boot' } },
  start: { background: { assetKey: 'backgrounds/start' } },
}
```

Slot background and frame:

```ts
slot: {
  background: { assetKey: 'backgrounds/slot', fit: 'cover' },
  frame: {
    assetKey: 'frames/main',
    enabled: true,
    fitTarget: 'reels',
    reelsPaddingPx: 24,
  },
}
```

Reel window, mask, symbol size, and spacing:

```ts
layout: {
  base: {
    reelWindow: {
      x: 250,
      y: 132,
      width: 780,
      height: 430,
      mask: { enabled: true, x: 0, y: 0 },
    },
    symbols: {
      width: 140,
      height: 140,
      gapY: 5,
      reelGap: 20,
    },
  },
}
```

Portrait and landscape overrides:

```ts
portrait: {
  viewport: { width: 720, height: 1280 },
  reelWindow: { x: 70, y: 245 },
},
landscape: {
  viewport: { width: 1280, height: 720 },
  reelWindow: { x: 250, y: 132 },
},
```

The mask is rectangular and reel-local. Polygon masks and alpha masks are not included.

**Orientation — config vs hooks**

- `layout.portrait` and `layout.landscape` are **engine-applied layout profiles**: the runtime switches viewport, reel offsets, mask, slot background, and frame per orientation when you define these blocks.
- `onOrientationChange` in `templateHooks.ts` is a **side-effect hook** for custom logic (logging, extra UI, analytics, optional audio triggers). It does not replace the config profiles; use both when you need automatic layout switching *and* your own reactions. See `TemplateOrientationChangeContext` in `templateHooks.ts` for the full payload (`appliedLayoutOrientation`, `layoutProfileCommitted`, etc.), not only `orientation` and dimensions.

## Spin Feel

Set the starter spin feel in `templateGameConfig.ts`:

```ts
spinFeel: {
  preset: 'premium',
}
```

Available presets:

| Preset | Use When |
|---|---|
| `premium` | Classic balanced feel with slower, more dramatic reel stops |
| `arcade` | Faster and snappier stops |
| `turbo` | Fastest preset with minimal delay |
| `normal` | Engine compatibility alias for the premium baseline |

The starter exposes preset selection only. Per-field spin timing overrides are not part of the starter config surface yet.

If `spinFeel.preset` is omitted from `templateGameConfig.ts`, the preset falls back to `build-config.json` (`starterRuntimeBuildConfig`).

## Audio cues

Audio for spin feel is configured in **`src/config/audioConfig.ts`**. The starter wires `spinStart` and `reelStop` into bootstrap via `main.ts` (`spinFeelOverrides.audioCues`). In plain terms: spinStart and reelStop belong to spin feel audio cues; `reelStop` may be a single key or an array rotated by reel index.

Win sounds belong to win presenter tier audioCue fields, not SpinAudioCues winSmall/winBig/winMega. The starter lists the shipped stock tier keys (`sfx_win_small`, `sfx_win_medium`, `sfx_win_big`, `sfx_win_mega`) in **`REFERENCED_AUDIO_ASSET_KEYS`** so `pnpm run doctor` validates those assets. If you add or change win tier `audioCue` keys, add them to that list too.

To reference additional audio asset keys from config or hook examples, add each key to **`REFERENCED_AUDIO_ASSET_KEYS`** in the same file so `pnpm run doctor` and referenced-key validation can ensure those keys exist in `assets/manifest.json`. Doctor validates only the keys listed in REFERENCED_AUDIO_ASSET_KEYS, not every possible runtime `audioBus.play(...)` call.

**Browser audio:** playback may stay locked until a **user gesture** (for example tap on the start screen). This is normal; keep the start screen enabled when testing first-spin audio.

**Not in this starter baseline:** background music is not part of the starter baseline; button click audio is not part of the starter baseline; scatter/bonus cue automation requires feature-specific hooks/events. Hook-based custom audio is possible, but doctor only validates keys you list.

## Hooks

Edit `src/config/templateHooks.ts`.

Available hooks:

| Hook | Source |
|---|---|
| `onBootStart` | Starter startup call before `bootstrap()` |
| `onBootComplete` | Starter call after successful `bootstrap()` |
| `onStartGame` | Starter call after the game handle is ready |
| `onSpinStart` | Engine `SPIN_KICKOFF_ACCEPTED` event |
| `onReelStop` | Governed classic stock stop surface |
| `onAllReelsStopped` | Derived from governed classic reel stop completions |
| `onWinStart` | Engine `WIN_PRESENT_START` event |
| `onWinComplete` | Engine `WIN_PRESENT_COMPLETE` event |
| `onRoundComplete` | Engine `SPIN_CYCLE_COMPLETE` event |
| `onResize` | Engine `VIEW_RESIZE` event |
| `onOrientationChange` | Engine `VIEW_ORIENTATION_CHANGE` event |
| `onError` | Boot, spin terminal, context, startup, and hook errors |

Examples:

```ts
export const templateHooks: TemplateHooks = {
  onSpinStart: ({ spinId }) => {
    console.log('[Hooks] spin start', spinId);
  },

  onWinStart: ({ totalWin }) => {
    console.log('[Hooks] win start', totalWin);
  },

  onOrientationChange: ({ orientation, width, height }) => {
    console.log('[Hooks] layout', orientation, width, height);
  },
};
```

Per-reel hooks are for the classic stock reel path. Turbo or interruption paths can skip some animated per-reel phases; use `onRoundComplete` for round-level truth.

## Symbol Art And Animation Aliases

Static symbol art lives in `src/config/slotConfig.ts`:

```ts
{ id: 0, name: 'Cherry', displayType: 'sprite', spriteKey: 'sym_cherry' }
```

Spritesheet animation aliases use a spritesheet asset key plus animation names exported by the sheet:

```ts
{
  id: 10,
  name: 'Bonus',
  displayType: 'animatedSprite',
  spriteKey: 'Symbols/Bonus',
  spriteSheetAnimation: 'idle',
  animations: {
    idle: 'idle',
    winStart: 'winStart',
    winEnd: 'winEnd',
  },
}
```

After adding or renaming art, run:

```bash
pnpm assets
pnpm run doctor
```

For presentation-only symbol overrides, use the commented `symbolDefinitionResolver` example in `src/main.ts`. Backend symbol IDs and payout behavior remain authoritative in `slotConfig.ts`; do not use presentation overrides to change math.

## Doctor diagnostics

`pnpm run doctor` checks build config, project layout, **template** values in `templateGameConfig.ts` (including reel window dimensions, mask sizes when set, spin preset), manifest shape, **referenced asset keys** (slot sprite keys, template scene keys, audio keys listed in `REFERENCED_AUDIO_ASSET_KEYS`), assets on disk, Spine sets, and loading hints. It verifies that expected config **files exist** (including `templateHooks.ts`) but does **not** execute or lint hook bodies. For audio, this means doctor validates listed audio keys, not every runtime `audioBus.play(...)` call.

**Limitation:** Doctor validates **asset keys** and template numbers, not every **spritesheet animation name** inside each spritesheet JSON. If a symbol points at a valid spritesheet key but a wrong `animations.idle` / `winStart` label, fix that by inspecting the spritesheet data or runtime warnings—doctor may still pass.

## Troubleshooting

Background not showing:

Check `scenes.boot.background.assetKey`, `scenes.start.background.assetKey`, or `scenes.slot.background.assetKey`, then run `pnpm assets` and `pnpm run doctor`.

Frame not showing:

Check `scenes.slot.frame.assetKey`, `enabled`, `fitTarget`, and `reelsPaddingPx`. The frame key must exist in `assets/manifest.json`.

Symbols clipped:

Check `layout.base.reelWindow.mask`, `layout.base.symbols.height`, and `gapY`. Disable mask debugging only after the reel window is aligned.

Reels not aligned with frame:

Adjust `layout.base.reelWindow.x`, `layout.base.reelWindow.y`, `width`, `height`, and frame `reelsPaddingPx`. Then test portrait and landscape overrides.

Animation alias missing:

Confirm the symbol uses the right spritesheet key and that `spriteSheetAnimation` / `animations.idle` / `animations.winStart` names exist in the spritesheet JSON. Regenerate assets after renaming files.

Start screen auto mode confusion:

`bootConfig.ts` controls `skipStartScreen`. Audio playback still depends on browser user gesture rules.

Audio does not play until user gesture:

This is expected browser behavior. Keep the start screen enabled when testing first-interaction audio.

Stale manifest:

Run `pnpm assets`. If `pnpm run doctor` reports missing referenced keys, update the config key or add the asset under `assets/`.

## Classic starter vs gravity variant

The **classic** starter (this tree) uses the full **`templateGameConfig.ts`** workflow: `composeEngineGameDefinition` maps template scenes, layout, mask, orientation, and spin preset into the engine bootstrap input.

The **gravity** starter generated by the CLI is a **different mechanics variant** (gravity-board / overlay baseline), but it now uses the same static `templateGameConfig.ts` + `composeEngineGameDefinition` visual composition path for boot/start scenes, slot background/frame, reel window, masks, symbols, gaps, and portrait/landscape profiles. Gravity cascade/drop movement remains separate and is described in that starter’s README.

## Not Included

- Polygon masks
- Alpha masks
- Visual editor
- Runtime skin switching
- Breakpoint system beyond the current portrait/landscape orientation config
- Advanced plugin/hooks framework
- Per-field spin timing overrides in starter config

See `docs/STARTER_CONTRACT.md` for strict contract details.
