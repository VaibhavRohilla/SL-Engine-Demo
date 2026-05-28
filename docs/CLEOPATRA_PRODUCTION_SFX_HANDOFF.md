# Cleopatra Production SFX Handoff

## Status (honest)

**Current on-disk audio is placeholder only.** All seven required `assets/sfx_*.wav` files are valid RIFF WAVs copied from the SL-Engine classic starter (~200 ms mono PCM 44.1 kHz, 17,684 bytes each, MD5 `9454fce1ce41278f4f5e9619f1a19413`). They are **not** Cleopatra production audio.

The production gate (`pnpm validate:production-sfx`, wired into `pnpm assets` and `pnpm doctor`) **must fail** until real production bytes replace these placeholders. Do not bypass, suppress, or downgrade `SFX_PLACEHOLDER_BYTE_IDENTICAL`.

**Do not:**

- Reuse one production file for every key
- Reuse the same starter placeholder for all keys in production
- Add synthetic/fake/empty WAVs to pass the gate
- Hand-edit `assets/manifest.json`
- Rename manifest keys without updating `cleopatraSfxManifestAssets` in `src/config/audioConfig.ts`
- Reintroduce an audio sprite pipeline

---

## Authority chain (do not fork)

```
src/config/audioConfig.ts
  cleopatraSfxManifestAssets
    → buildCleopatraAudioIntentAssets()
    → src/config/assetManifestIntent.ts
    → tools/local/pipeline/manifestFromIntent.ts
    → pnpm assets
    → assets/manifest.json
    → runtime loader
```

Runtime spin/win cues reference the same keys via `cleopatraSpinFeelAudioCues` in `audioConfig.ts`. **Keys are sealed** — replace file bytes in place at the paths below unless you deliberately change `path` in `cleopatraSfxManifestAssets`.

---

## Required keys and semantics

| Key | Path | Runtime role | Audio direction |
|-----|------|--------------|-----------------|
| `sfx_spin_start` | `assets/sfx_spin_start.wav` | Spin acceleration / start cue | Short, crisp start; establishes motion without masking UI; ~150–400 ms typical |
| `sfx_reel_stop_a` | `assets/sfx_reel_stop_a.wav` | Reel stop variation A | Distinct mechanical/impact stop; pairs with B for alternation |
| `sfx_reel_stop_b` | `assets/sfx_reel_stop_b.wav` | Reel stop variation B | Clearly different timbre/attack from A; same general family |
| `sfx_win_small` | `assets/sfx_win_small.wav` | Small win tier | Light, short, low drama; shortest win cue in the set |
| `sfx_win_medium` | `assets/sfx_win_medium.wav` | Medium win tier | Richer than small; noticeable lift, still compact |
| `sfx_win_big` | `assets/sfx_win_big.wav` | Big win tier | Celebratory; longer/more energy than medium |
| `sfx_win_mega` | `assets/sfx_win_mega.wav` | Strongest wired win cue | Peak impact in current profile; must read clearly above big |

**Optional future (not in manifest today):** `sfx_win_epic` — only add if win presentation profile and product require a separate epic-tier cue.

---

## Expected audio metadata (documentation only)

Guidance for sound design handoff — **not** enforced by tooling (subjective loudness/duration cannot be proven safely).

| Key | Target duration (guide) | Loudness / mix (guide) | Must differ from |
|-----|-------------------------|------------------------|------------------|
| `sfx_spin_start` | 0.15–0.45 s | Peak below win cues; no harsh clip | reel stops, wins |
| `sfx_reel_stop_a` | 0.08–0.35 s | Tight transient; reel-family level | `sfx_reel_stop_b` (timbre) |
| `sfx_reel_stop_b` | 0.08–0.35 s | Same family as A, alternate character | `sfx_reel_stop_a` |
| `sfx_win_small` | 0.2–0.8 s | Quietest win; quick decay | medium/big/mega |
| `sfx_win_medium` | 0.3–1.2 s | Step up from small | small, big, mega |
| `sfx_win_big` | 0.5–2.0 s | Clear celebration | small, medium, mega |
| `sfx_win_mega` | 0.6–2.5 s | Strongest present win | small, medium, big |

---

## Accepted file formats

| Format | Status |
|--------|--------|
| **WAV (PCM)** | **Required today** — matches loader and manifest `type: 'audio'` paths |
| MP3 / OGG | Not wired — would require manifest + loader contract change (out of scope for drop-in) |

**WAV requirements:**

- RIFF WAVE, PCM (not empty, not corrupt)
- Mono or stereo acceptable; mono preferred for SFX footprint
- 44.1 kHz or 48 kHz recommended
- 16-bit PCM typical

---

## Naming and path rules

1. **Keys are fixed** — use the table above; do not invent parallel key lists.
2. **Paths** — files live at `assets/<filename>` matching `cleopatraSfxManifestAssets[].path` (e.g. `sfx_spin_start.wav`).
3. **Replace in place** — overwrite `assets/sfx_*.wav` bytes; keep filenames unless `audioConfig.ts` is updated deliberately.
4. **No hand-editing** `assets/manifest.json` — regenerate with `pnpm assets`.
5. **Remove junk** — delete macOS `assets/._sfx_*.wav` AppleDouble files if present (not manifest-referenced).

---

## Replacement workflow (summary)

Detailed steps: [CLEOPATRA_PRODUCTION_SFX_REPLACEMENT_CHECKLIST.md](./CLEOPATRA_PRODUCTION_SFX_REPLACEMENT_CHECKLIST.md)

1. Receive seven **distinct** production WAVs from audio production.
2. Back up placeholders if needed.
3. Copy/replace files at existing `assets/sfx_*.wav` paths.
4. Run `pnpm assets` (regenerates manifest from intent).
5. Run `pnpm validate:production-sfx` — must **PASS**.
6. Run `pnpm doctor`, `pnpm typecheck`, `pnpm build`.
7. Verify MD5s differ from `9454fce1ce41278f4f5e9619f1a19413` and are not all identical.
8. Commit with message guidance below.

---

## Validation commands

```bash
# Primary production SFX gate (fails today — expected)
pnpm validate:production-sfx

# Full asset pipeline (includes sfx-production:validate)
pnpm assets

# Doctor (step includes production SFX gate)
pnpm doctor

# Sanity after integration
pnpm typecheck
pnpm build

# Manual inspection
file assets/sfx_*.wav
md5 assets/sfx_*.wav
```

---

## Rejection criteria (gate will fail)

| Condition | Code | Severity |
|-----------|------|----------|
| File missing | `SFX_FILE_MISSING` | error (blocks) |
| Zero-byte file | `SFX_FILE_EMPTY` | error (blocks) |
| MD5 matches starter placeholder `9454fce1ce41278f4f5e9619f1a19413` | `SFX_PLACEHOLDER_BYTE_IDENTICAL` | error (blocks) |
| Non-placeholder keys share identical bytes | `SFX_PLACEHOLDER_BYTE_IDENTICAL` | advisory warning (does not block pass alone) |

---

## Commit message guidance

**When only docs/tooling (no new audio):**

```
docs(cleopatra): add production sfx handoff and replacement checklist
```

**When production WAVs are integrated:**

```
feat(cleopatra): replace placeholder sfx with production audio
```

Include in PR body: confirmation that `pnpm validate:production-sfx`, `pnpm assets`, and `pnpm doctor` pass; list of keys replaced; note that MD5s are no longer starter placeholder.

---

## Related documents

- [CLEOPATRA_PRODUCTION_SFX_REPLACEMENT_CHECKLIST.md](./CLEOPATRA_PRODUCTION_SFX_REPLACEMENT_CHECKLIST.md) — step-by-step integration
- [CLEOPATRA_AUDIO_PRODUCTION_SFX_PHASE_11_REPORT.md](./CLEOPATRA_AUDIO_PRODUCTION_SFX_PHASE_11_REPORT.md) — Phase 11 audit
- [CLEOPATRA_AUDIO_PRODUCTION_HARDENING.md](./CLEOPATRA_AUDIO_PRODUCTION_HARDENING.md) — authority model
- [CLEOPATRA_PRODUCTION_SFX_HANDOFF_PHASE_12_REPORT.md](./CLEOPATRA_PRODUCTION_SFX_HANDOFF_PHASE_12_REPORT.md) — Phase 12 implementation report
