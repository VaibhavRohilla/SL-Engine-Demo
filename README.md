# Cleopatra

Sample / integration game built on [`@fnx/sl-engine`](https://github.com/fnx-igaming/sl-engine) (local sibling checkout).

## SDK layout

| What | Where |
|------|--------|
| **Runtime package** | `dependencies["@fnx/sl-engine"]` → `file:../SL-Engine` (see `package.json`) |
| **Fast typecheck / editor** | `tsconfig.json` `paths` → `../SL-Engine/src/...` |

After changing engine APIs, run in **SL-Engine**: `pnpm build:sdk` so `node_modules/@fnx/sl-engine` has fresh `dist/`.

## Commands

```bash
pnpm install
pnpm dev          # dev server (esbuild)
pnpm typecheck
pnpm build
pnpm doctor
```

See `docs/STARTER_CONTRACT.md` for tooling contract; Cleopatra uses sibling `file:../SL-Engine` instead of `vendor/sl-engine`.
