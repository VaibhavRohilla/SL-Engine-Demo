# @fnx/sl-engine

SL-Engine is a **frontend slot presentation SDK** for building deterministic, **backend-authoritative** HTML5 slot games with TypeScript, PixiJS, generated starters, configurable UI, and governed presentation hooks.

It is aimed at **small and mid-size iGaming teams**, agencies, and studios that need to **ship polished slot frontends faster** while keeping **math, wallet, RGS, and jurisdictional compliance** outside the engine.

---

## What SL-Engine is not

SL-Engine is **not**:

- an RGS or game server
- a wallet or player account system
- a certified math engine
- a jurisdictional compliance package
- a no-code slot builder
- a substitute for operator QA, integration testing, or jurisdiction-specific certification work

It **presents** backend-authored outcomes and coordinates spin lifecycle and presentation. See **[Scope and limitations](docs/LIMITATIONS.md)**.

---

## Install

```bash
pnpm add @fnx/sl-engine
# peer deps
pnpm add pixi.js@^8.0.0 zod@^3.0.0 howler@^2.2.0
```

ESM-only. Requires Node 18+, TypeScript 5+, and an ESM-capable bundler (Vite, Webpack 5, etc.).

| Subpath | Use |
|---|---|
| `@fnx/sl-engine` | Production games — `bootstrap`, `GameHandle`, stable public APIs |
| `@fnx/sl-engine/testing` | **Vitest / adapter CI tests only** — not for production shells |

Deep imports into `dist/...` paths are **not** supported. See [`docs/reference/architecture/contracts/PACKAGE_AND_ENTRY_FREEZE.md`](docs/reference/architecture/contracts/PACKAGE_AND_ENTRY_FREEZE.md).

---

## Verify this repository

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build:sdk
```

---

## Documentation

Evaluating SL-Engine for a studio or client project? See the **[Buyer Proof Pack](docs/buyer-proof/README.md)**.

| Start here | Purpose |
|---|---|
| **[`docs/README.md`](docs/README.md)** | Product docs home — paths for run, reskin, integrate |
| **[`docs/GETTING_STARTED.md`](docs/GETTING_STARTED.md)** | Shortest path to a running project |
| **[`docs/LIMITATIONS.md`](docs/LIMITATIONS.md)** | Honest scope, non-goals, and policy gates |
| **[`docs/DOCS_INDEX.md`](docs/DOCS_INDEX.md)** | Full map of guides and deep reference |

**Minimal in-repo example:** [`examples/minimal/README.md`](examples/minimal/README.md)

**Generate a standalone starter:**

```bash
npx @fnx/create-sl-engine my-slot --starter classic --layout standard
# or: --starter gravity --layout ragged
```

**Layout policy:** [`docs/reference/LAYOUT_POLICY_AND_LIMITATIONS.md`](docs/reference/LAYOUT_POLICY_AND_LIMITATIONS.md). The npm package tarball may ship README-only; use the repo or GitHub file view for full docs.

---

## Overview

SL-Engine is a **deterministic, presentation-oriented** runtime: the same inputs follow the same spin lifecycle and timeline contracts. **Win and grid truth come from the server** (`SpinOutcome`); the frontend validates shape and **presents** stages, reels, HUD, and audio. Built-in stress and pooling tests support **engineering verification** — they are not a substitute for operator or lab certification.

---

## Quick start (`bootstrap`)

```typescript
import { bootstrap } from '@fnx/sl-engine';
import type { ISlotUI, IWinFormatter } from '@fnx/sl-engine';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

let balance = 1000;
const gameUI: ISlotUI = {
  getCurrentBet: () => 1,
  canAffordBet:  (bet)    => balance >= bet,
  deductBet:     (bet)    => { balance -= bet; },
  addWin:        (amount) => { balance += amount; },
};

const winFormatter: IWinFormatter = {
  formatWin:     (amount) => `$${amount.toFixed(2)}`,
  formatBalance: (amount) => `$${amount.toFixed(2)}`,
};

const handle = await bootstrap({
  canvas,
  slotConfig:   mySlotConfig,    // SlotConfig — see docs/reference/AUTHORING_SLOT_CONFIG.md
  resultSource: myBackendAdapter, // ISpinResultSource — production adapter to your RGS/server
  gameUI,
  winFormatter,
  spinFeel: 'premium',
});

const result = await handle.runSpin(1, false);

if (result.kind === 'accepted') {
  console.log('Win:', result.cycleSuccess.outcome?.totalWin ?? 0);
} else if (result.kind === 'failed') {
  console.error('Spin failed terminally:', result.terminal);
} else {
  console.warn('Spin was not accepted:', result);
}

await handle.destroy();
```

### Alternative — `startSpin` + `waitForSpinCycle` (explicit kickoff / completion split)

Pick **one** of the two patterns above. **Do not chain** both in the same spin loop — `runSpin` already calls `waitForSpinCycle` internally.

`startSpin` resolves with a **kickoff result union** — **not** cycle completion. On `kind: 'accepted'`, call `.kickoff.waitForSpinCycle()` for authoritative completion.

```typescript
import { SpinTerminalExecutionError } from '@fnx/sl-engine';

const started = await handle.startSpin(1, false);
if (started.kind === 'accepted') {
  try {
    const cycle = await started.kickoff.waitForSpinCycle();
    console.log('Cycle finished:', cycle.outcome?.totalWin ?? 0);
  } catch (error) {
    if (error instanceof SpinTerminalExecutionError) {
      console.error('Spin failed terminally:', error);
    } else {
      throw error;
    }
  }
} else {
  console.warn('Spin was not accepted:', started);
}
```

**Kickoff vs completion:** see [`docs/reference/architecture/contracts/TERMINAL_TRUTH_AND_HOST_BOUNDARIES.md`](docs/reference/architecture/contracts/TERMINAL_TRUTH_AND_HOST_BOUNDARIES.md) for HUD, EventBus projections, and refusal reasons.

---

## Feature composition

`SlotFeaturePack` is the supported feature extension model. Do not register timeline hooks against internal registries as a product path — compose through `bootstrap` (`advanced.featurePacks`). Reel mechanics use `IReelMechanicPlugin` / `MechanicPack`; outcome features use JSON on spin outcomes and `FeatureSchemaRegistry`.

**Symbol definitions:** `slotConfig.symbols` owns the id universe; optional `symbolDefinitionResolver` merges presentation overrides. See [`docs/reference/architecture/contracts/SYMBOL_AUTHORITY_AND_HOST_BOUNDARIES.md`](docs/reference/architecture/contracts/SYMBOL_AUTHORITY_AND_HOST_BOUNDARIES.md).

---

## Development (maintainers)

For merge and release discipline, see **`package.json`** scripts and [`docs/TESTING_AND_DOCTOR.md`](docs/TESTING_AND_DOCTOR.md). Determinism and governance boundaries are documented under [`docs/reference/architecture/contracts/`](docs/reference/architecture/contracts/).

---

## License

Distributed under private license. See the LICENSE file in the published package for details.
