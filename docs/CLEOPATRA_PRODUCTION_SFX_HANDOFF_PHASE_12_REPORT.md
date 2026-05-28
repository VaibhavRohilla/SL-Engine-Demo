# Cleopatra Production SFX Handoff — Phase 12 Report

## Executive verdict

**PASS (integration readiness).** Phase 12 adds production-audio handoff documentation, a replacement checklist, and clearer validator diagnostics. **No fake or synthetic audio was added.** The production SFX gate remains strict and **correctly fails** with seven `SFX_PLACEHOLDER_BYTE_IDENTICAL` errors until real Cleopatra WAVs replace starter placeholder bytes.

| Area | Verdict |
|------|---------|
| Handoff / checklist docs | **PASS** |
| Gate strictness | **PASS** (unchanged severity) |
| Placeholder honesty | **PASS** |
| Runtime / gameplay | **PASS** (no changes) |
| `pnpm typecheck` / `pnpm build` | **PASS** |
| Audio content | **BLOCKED** (expected) |

> No SL-Engine runtime, starter template, runtime loader, symbol display runtime, WinViz runtime, gameplay logic, or old module runtime files were changed.

---

## Files changed

| File | Change |
|------|--------|
| `docs/CLEOPATRA_PRODUCTION_SFX_HANDOFF.md` | **New** — key semantics, formats, workflow, rejection criteria |
| `docs/CLEOPATRA_PRODUCTION_SFX_REPLACEMENT_CHECKLIST.md` | **New** — step-by-step integration checklist |
| `docs/CLEOPATRA_PRODUCTION_SFX_HANDOFF_PHASE_12_REPORT.md` | **New** — this report |
| `docs/CLEOPATRA_AUDIO_PRODUCTION_SFX_PHASE_11_REPORT.md` | Links to Phase 12 handoff docs |
| `docs/CLEOPATRA_AUDIO_PRODUCTION_HARDENING.md` | Links to Phase 12 handoff docs |
| `tools/local/pipeline/sfxProductionValidate.ts` | Clearer error messages (key, path, placeholder md5, fix commands) |
| `tools/validate-production-sfx.ts` | FAIL footer with handoff doc paths and next commands |

**Phase 12 commit boundary (`refactor(cleopatra): close production sfx gate and audio authority`):**

- **In scope:** audio authority (`cleopatraSfxManifestAssets`), manifest-from-intent wiring, production SFX gate in `validate:production-sfx` / `pnpm assets` / `pnpm doctor`, legacy audio sprite + regex config surface removal, supporting pipeline/docs listed in this report.
- **Out of scope (unstaged):** template-intent, WinViz, symbol intent migration, layout/HUD/spin-feel, `DemoResultSource`, unrelated probes/reports.
- **Production SFX content:** still **BLOCKED** — gate intentionally fails on seven starter placeholder WAVs until real Cleopatra audio lands.
- **No runtime/gameplay behavior changed** in this commit boundary (tooling + manifest authority only).

**Prior Phase 12 docs commit (`bde0992`):** handoff + replacement checklist + validator messaging only.

**Integration closure (this commit):**

| File | Why |
|------|-----|
| `src/config/audioConfig.ts` | `cleopatraSfxManifestAssets` — validator import target |
| `package.json` | `validate:production-sfx` script |
| `tools/local/pipeline/pipeline.ts` | `sfx-production:validate` in `pnpm assets` |
| `tools/local/commands/runDoctor.ts` | production SFX step 9/12 |
| Deleted: `audioSpriteBuild.ts`, `manifestGenerate.ts`, `audioConfigSurface.ts`, `slotConfigSurface.ts` | legacy removed, no backward compat |

**Not changed in Phase 12:** `assets/sfx_*.wav` bytes, SL-Engine runtime, WinViz runtime, symbol clip disks.

---

## Post-audit closure (10/10 target)

| Gap (hostile audit) | Resolution |
|---------------------|------------|
| Validator imported `cleopatraSfxManifestAssets` not on commit `bde0992` | Commit `audioConfig.ts` hardening with gate wiring |
| `validate:production-sfx` missing from committed `package.json` | Commit `package.json` script |
| `doctor` / `assets` gate not in Phase 12 commit | Commit `pipeline.ts` + `runDoctor.ts` |
| Phase 11 report claimed doctor/assets 0 errors | Report corrected — SFX gate failures documented |
| Legacy duplicate audio authority | Removed — single `cleopatraSfxManifestAssets` list |
| `StarterAudioProfile` stale in `composeEngineGameDefinition.ts` | Use `CleopatraAudioProfile` (no compat alias) |
| `pnpm doctor` crashed on Node 22+ (JSON import attribute) | `build-config.json` import uses `with { type: 'json' }` |
| Symbol keys dropped from `referenced-keys:validate` | `getCleopatraSymbolSpriteKeys()` from `slotConfig` (no regex surface) |

---

## Handoff docs created

1. **[CLEOPATRA_PRODUCTION_SFX_HANDOFF.md](./CLEOPATRA_PRODUCTION_SFX_HANDOFF.md)** — authority chain, seven required keys with semantic/audio direction, documentation-only duration/loudness table, WAV format rules, naming/path rules, validation commands, rejection criteria, commit guidance.

2. **[CLEOPATRA_PRODUCTION_SFX_REPLACEMENT_CHECKLIST.md](./CLEOPATRA_PRODUCTION_SFX_REPLACEMENT_CHECKLIST.md)** — backup, in-place replace, `pnpm assets` / validate / doctor / typecheck / build, MD5 verification, commit message.

---

## Validator message changes

Errors now include:

- Explicit **key** and **file path** (`assets/<path>`)
- Whether bytes **match starter placeholder** (md5 + duration)
- **Doc links** and **fix command** (`pnpm validate:production-sfx`)
- Prefix `Production SFX error:` (not vague “warning” for blocking issues)

CLI footer on FAIL:

```
Blocker: required SFX are missing, empty, or still starter placeholder bytes.
Handoff: docs/CLEOPATRA_PRODUCTION_SFX_HANDOFF.md
Checklist: docs/CLEOPATRA_PRODUCTION_SFX_REPLACEMENT_CHECKLIST.md
After replacing WAVs: pnpm assets && pnpm validate:production-sfx && pnpm doctor
```

Severity unchanged: placeholder detection remains **`error`** (blocks pass).

---

## Current blocker status

All seven required SFX remain SL-Engine starter placeholders:

| File | MD5 | Format | Duration |
|------|-----|--------|----------|
| All `assets/sfx_*.wav` | `9454fce1ce41278f4f5e9619f1a19413` | RIFF WAVE PCM 16-bit mono 44100 Hz | 0.2 s |

Production Cleopatra-branded audio has **not** been delivered.

---

## Command results

```bash
pnpm validate:production-sfx   # FAIL — 7 errors (expected)
pnpm typecheck               # PASS
pnpm build                   # PASS
pnpm assets                  # FAIL — 7 SFX errors only (21 warnings non-blocking)
pnpm doctor                  # FAIL — 7 SFX errors only (21 warnings non-blocking)
file assets/sfx_*.wav        # Valid WAV PCM mono 44100 Hz
md5 assets/sfx_*.wav         # All md5=9454fce1ce41278f4f5e9619f1a19413
```

### Sample validator output (abbreviated)

```
✗ [SFX_PLACEHOLDER_BYTE_IDENTICAL] Production SFX error: key="sfx_spin_start" file="assets/sfx_spin_start.wav" matches starter placeholder bytes (md5=9454fce1ce41278f4f5e9619f1a19413, duration=0.2s). ...
  7 errors, 0 warnings, 0 advisories
Cleopatra production SFX validation: FAIL
```

---

## Expected failing gates (today)

| Gate | Status | Cause |
|------|--------|-------|
| `pnpm validate:production-sfx` | **FAIL** | 7× `SFX_PLACEHOLDER_BYTE_IDENTICAL` |
| `pnpm assets` | **FAIL** | Same 7 SFX errors (sfx-production:validate wired) |
| `pnpm doctor` | **FAIL** | Same 7 SFX errors (step 8/10 production SFX) after tooling reaches validation |
| `pnpm typecheck` | **PASS** | `CleopatraAudioProfile` aligned with `composeEngineGameDefinition` |
| `pnpm build` | **PASS** | No audio content dependency |

`build-config.json` is loaded with ESM `import … with { type: 'json' }` in `buildConfigRuntime.ts` so `pnpm doctor` runs on Node 22+ without import-attribute crashes.

No `doctor:dev` bypass was added — default `doctor` stays production-strict.

---

## Next action when WAVs arrive

1. Follow [CLEOPATRA_PRODUCTION_SFX_REPLACEMENT_CHECKLIST.md](./CLEOPATRA_PRODUCTION_SFX_REPLACEMENT_CHECKLIST.md).
2. Replace seven distinct production WAVs at existing `assets/sfx_*.wav` paths.
3. Run `pnpm assets && pnpm validate:production-sfx && pnpm doctor`.
4. Confirm MD5s ≠ `9454fce1ce41278f4f5e9619f1a19413` and files are not all byte-identical.
5. Commit: `feat(cleopatra): replace placeholder sfx with production audio`.

---

## Acceptance criteria scorecard

| Criterion | Status |
|-----------|--------|
| Handoff doc exists | **PASS** |
| Replacement checklist exists | **PASS** |
| Placeholder status honest | **PASS** |
| Production gate strict | **PASS** |
| No fake audio | **PASS** |
| No runtime/gameplay changes | **PASS** |
| typecheck/build pass | **PASS** |
| assets/doctor fail only on placeholder gate | **PASS** (expected) |
| Commit excludes template-intent/WinViz/symbol migration | **PASS** |
| Report exists | **PASS** |

**Phase 12 verdict: PASS (readiness).** **Audio content verdict: BLOCKED (unchanged).**

---

## Commit messages

**Phase 12 (docs + validator messaging) — landed:**

```
docs(cleopatra): add production sfx handoff and replacement checklist
```

**Integration closure (commit with hardening — required for self-contained tree):**

```
refactor(cleopatra): close production sfx gate and audio authority

- cleopatraSfxManifestAssets sole audio authoring source
- wire sfx-production:validate into assets and doctor
- add validate:production-sfx script
- remove legacy sprite pipeline and regex config surfaces
- no backward-compat shims
```
