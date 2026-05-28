# Cleopatra Production SFX Replacement Checklist

Use this checklist when real Cleopatra production WAVs are delivered. **Until then, `pnpm validate:production-sfx` is expected to FAIL** — that is correct production-strict behavior.

Handoff reference: [CLEOPATRA_PRODUCTION_SFX_HANDOFF.md](./CLEOPATRA_PRODUCTION_SFX_HANDOFF.md)

---

## Pre-flight

- [ ] Seven distinct production WAVs received (one per key — not one file copied seven times)
- [ ] Keys match sealed manifest list (do not rename keys):
  - `sfx_spin_start` → `assets/sfx_spin_start.wav`
  - `sfx_reel_stop_a` → `assets/sfx_reel_stop_a.wav`
  - `sfx_reel_stop_b` → `assets/sfx_reel_stop_b.wav`
  - `sfx_win_small` → `assets/sfx_win_small.wav`
  - `sfx_win_medium` → `assets/sfx_win_medium.wav`
  - `sfx_win_big` → `assets/sfx_win_big.wav`
  - `sfx_win_mega` → `assets/sfx_win_mega.wav`
- [ ] Files are valid RIFF WAV PCM (not empty, not corrupt)
- [ ] **Not** the SL-Engine starter placeholder (MD5 must **not** be `9454fce1ce41278f4f5e9619f1a19413`)

---

## Backup (optional)

- [ ] Copy current placeholders to a safe archive if rollback is needed:
  ```bash
  mkdir -p ../cleopatra-sfx-placeholder-backup
  cp assets/sfx_*.wav ../cleopatra-sfx-placeholder-backup/
  ```

---

## Replace files

- [ ] Replace WAV files **in place** at existing paths under `assets/` (do not hand-edit `assets/manifest.json`)
- [ ] Do **not** change `cleopatraSfxManifestAssets` keys/paths unless product requires a deliberate path migration
- [ ] Remove macOS junk if present: `assets/._sfx_*.wav`

---

## Regenerate and validate

- [ ] `pnpm assets` — regenerates manifest from intent; runs production SFX gate
- [ ] `pnpm validate:production-sfx` — **must PASS** (0 errors)
- [ ] `pnpm doctor` — **must PASS** (production SFX step included)
- [ ] `pnpm typecheck` — **must PASS**
- [ ] `pnpm build` — **must PASS**

---

## Verify integrity

- [ ] `git diff assets/manifest.json` — only expected audio metadata if any; no manual edits
- [ ] `md5 assets/sfx_*.wav` — all seven MD5s differ from `9454fce1ce41278f4f5e9619f1a19413`
- [ ] `md5 assets/sfx_*.wav` — not all seven identical to each other
- [ ] `file assets/sfx_*.wav` — reports valid RIFF WAVE PCM
- [ ] Spot-check in browser: spin start, reel stops (A/B alternation), win tiers (small → mega)

---

## Report and commit

- [ ] Update or add integration note in Phase 11/12 reports if doing a formal content closure
- [ ] Commit with:
  ```
  feat(cleopatra): replace placeholder sfx with production audio
  ```
- [ ] PR test plan includes: `pnpm validate:production-sfx`, `pnpm assets`, `pnpm doctor`, `pnpm build`

---

## If validation still fails

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `SFX_PLACEHOLDER_BYTE_IDENTICAL` + placeholder md5 | File still starter bytes | Replace with real production WAV |
| `SFX_FILE_MISSING` | Wrong path or missing copy | Place file at `assets/<path>` from handoff table |
| `SFX_FILE_EMPTY` | Truncated export | Re-export WAV |
| Advisory: keys share identical bytes | Same file copied to multiple keys | Deliver distinct audio per key |

Re-run after fixes:

```bash
pnpm assets && pnpm validate:production-sfx && pnpm doctor
```

---

## Expected state before production audio exists

| Command | Expected today |
|---------|----------------|
| `pnpm validate:production-sfx` | **FAIL** (7 placeholder errors) |
| `pnpm assets` | **FAIL** if SFX gate wired (production-strict) |
| `pnpm doctor` | **FAIL** if SFX gate wired (production-strict) |
| `pnpm typecheck` | **PASS** |
| `pnpm build` | **PASS** |

No `doctor:dev` bypass — default `doctor` stays production-strict.
