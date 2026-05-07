# SL-Engine Starter Contract

## Purpose

This document defines the production contract for the generated starter project.

- Starter owns game content, config, tooling code, and vendored runtime package.
- `tools/` is starter-local, not package-proxied.
- Generator output must install and run outside this monorepo.

## Starter Tooling Surface

```text
tools/
  assets.ts
  doctor.ts
  build.ts
  dev.ts
  build-config.schema.json
  local/**
```

- `assets.ts` — starter asset pipeline command entry
- `doctor.ts` — starter project health command entry
- `build.ts` — starter production build command entry
- `dev.ts` — starter dev server command entry
- `local/**` — local tooling implementation
- `build-config.schema.json` — schema mirror for IDE validation

## Starter Script Surface

```json
{
  "dev": "tsx tools/dev.ts",
  "build": "tsx tools/build.ts",
  "typecheck": "tsc --noEmit",
  "assets": "tsx tools/assets.ts",
  "doctor": "tsx tools/doctor.ts",
  "clean": "node -e \"const fs=require('node:fs');fs.rmSync('dist',{recursive:true,force:true});const dir='generated';if(fs.existsSync(dir)){for(const file of fs.readdirSync(dir)){if(file.endsWith('.json'))fs.rmSync(dir+'/'+file,{force:true});}}\""
}
```

## Dependency Contract

- `dependencies.@fnx/sl-engine` must be `file:./vendor/sl-engine`
- no external tooling package dependency in any section
- no `workspace:` protocol dependency specs
- no `file:` dependency specs except the vendored engine path above

## Vendored Engine Contract

`vendor/sl-engine` must be a package-valid runtime surface:

- package root contains `package.json`
- `package.json.name` is `@fnx/sl-engine`
- `dist/index.js`, `dist/index.cjs`, and `dist/index.d.ts` exist

## Config Authority

- Canonical config input: `build-config.json`
- Allowed top-level groups: `game`, `display`, `assets`, `boot`, `spinFeel`
- Schema artifact for IDEs: `tools/build-config.schema.json`
- Runtime starter visual/layout/spin-feel config: `src/config/templateGameConfig.ts`
- Runtime starter lifecycle hooks: `src/config/templateHooks.ts`
- Hook wiring is centralized in `src/config/registerTemplateHooks.ts`; `src/main.ts` remains bootstrap composition only.

## Artifact Policy

- `assets/manifest.json`: generated, committed, runtime-required
- `assets/audio/sprites/*`: generated, committed, runtime-required when audio sprites are used
- `src/Asset.d.ts`: generated, committed, DX-only
- `generated/*.json`: generated, uncommitted, DX diagnostics only
- `dist/`: generated, uncommitted, build output only

## Verification Scope

Contract checks validate tooling ownership, dependency posture, vendored runtime shape, script surface, and docs alignment.
