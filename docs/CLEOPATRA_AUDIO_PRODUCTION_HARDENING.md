# Cleopatra Audio — Production Hardening (10/10)

## Executive verdict

**PASS (production-hardened).** Audio authority is consolidated in `src/config/audioConfig.ts`. Manifest intent composes audio entries from that module; runtime spin and win-tier cues reference the same keys. Dormant starter audio-sprite pipeline and regex-based config extraction were removed. No backward-compat shims.

## Authority model

```
cleopatraSfxManifestAssets (audioConfig.ts)
  ├─ buildCleopatraAudioIntentAssets() → assetManifestIntent
  ├─ cleopatraSpinFeelAudioCues → main.ts → spinFeelOverrides.audioCues
  └─ getCleopatraReferencedAudioKeys() → referenced-keys:validate
```

Fail-fast at module load: every `cleopatraSpinFeelAudioCues` key must exist in `cleopatraSfxManifestAssets`.

## Removed (no backward compat)

| Item | Reason |
|------|--------|
| `tools/local/pipeline/audioSpriteBuild.ts` | Unused — Cleopatra uses per-WAV assets, not sprites |
| `tools/local/runtime-surfaces/audioConfigSurface.ts` | Regex parse replaced by direct `audioConfig` import |
| `REFERENCED_AUDIO_ASSET_KEYS` manual duplicate list | Derived from `cleopatraSfxManifestAssets` |
| `StarterAudioProfile` / `StarterAudioAssetKey` | Renamed to `CleopatraAudioProfile` / `CleopatraSfxAssetKey` |
| `ArtifactPolicy['assets/audio/sprites/']` | Misleading — sprites never generated |
| Unused `AUDIO_*` issue codes | Only used by deleted sprite builder |

## Win-tier wiring

`cleopatraSpinFeelAudioCues` now includes `winSmall`, `winMedium`, `winBig`, `winMega` so engine win presentation can play tier SFX (aligned with SL-Engine default spin-feel presets).

## Remaining product work (not architecture debt)

- Replace starter stub `.wav` files (~200ms identical tone) with Cleopatra-branded production SFX when audio art is ready. See `docs/CLEOPATRA_AUDIO_PRODUCTION_SFX_PHASE_11_REPORT.md` (Phase 11 audit: **content BLOCKED**, architecture ready).
- Gate: `pnpm validate:production-sfx`, `pnpm doctor`, and `pnpm assets` all run `sfx-production:validate` (errors until real SFX replace starter MD5 `9454fce1ce41278f4f5e9619f1a19413`).
- Optional: add `sfx_win_epic` if epic-tier wins are enabled in win presentation profile.

**Production handoff (Phase 12):**

- [CLEOPATRA_PRODUCTION_SFX_HANDOFF.md](./CLEOPATRA_PRODUCTION_SFX_HANDOFF.md) — required keys, semantics, formats, rejection criteria
- [CLEOPATRA_PRODUCTION_SFX_REPLACEMENT_CHECKLIST.md](./CLEOPATRA_PRODUCTION_SFX_REPLACEMENT_CHECKLIST.md) — drop-in workflow and proof commands
- [CLEOPATRA_PRODUCTION_SFX_HANDOFF_PHASE_12_REPORT.md](./CLEOPATRA_PRODUCTION_SFX_HANDOFF_PHASE_12_REPORT.md) — Phase 12 implementation report

## Commands

```bash
pnpm validate:manifest-intent   # PASS — intent authority
pnpm validate:template-intent  # PASS — template intent
pnpm typecheck                 # PASS
pnpm build                     # PASS
pnpm validate:production-sfx   # FAIL until real Cleopatra WAVs (7 placeholder errors today)
pnpm assets                    # FAIL — same SFX gate wired in pipeline
pnpm doctor                    # FAIL — same SFX gate at step 9/12
```

## Commit message

```
refactor(cleopatra): harden audio manifest authority and remove sprite pipeline
```
