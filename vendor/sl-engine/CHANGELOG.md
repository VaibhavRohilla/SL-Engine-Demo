# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

## [0.0.1] - 2026-04-15

### Breaking Changes

- Removed public SDK exports `shouldApplySkip` and `isTerminalSkipState` (they remain as `@internal` helpers in `runtime/skip/SkipCheckpoints.ts` for skip arbitration only).
- `ProductionSpinEntryGateDeps` / `SpinEntryAuthorityDeps`: `getTurboPrimingTarget` renamed to `getTurboDurationTarget` (same `ITurboDurationTarget` contract — SpinFeel reel timing wiring only; not `SpinRuntimePreferences`).

### Changed

- **Authority consolidation (runtime):** Stock SpinFlow callback bodies, reel/strip subscriptions, and planner bind live in `stockSpinFlowEngineIntegration.ts`; `SpinLifecycleBinder` is thin (spin start + Vitest seams). Classic grid-stop uses `ReelsView.subscribeClassicSymbolDisplayStripStopCompleteObserver` (game hooks first, engine observer after). Spin-loop fade eligibility is `SpinFlow.consumeStockSpinLoopFadeEligibility`; `SpinPresentationLifecycleState` holds audio handles only.
- **Skip / interrupt:** `SKIP_AND_INTERRUPT_CONTRACT.md` — single entry `SpinFlow.handleRuntimeInterruption`; no `GameHandle.requestSpinInterrupt`, no public `ITimelinePlanner.skip` / `CommandQueue.skip`, no `WinPresenterStrategy.skip`. Recovery uses `requestRecoverySettleNow` / `SpinFlow.internalRecoveryClearSkipAfterHydrate` (hydrate hook only).
- **Win pre-present hook:** `WinPresentationCoordinator` defaults to `beforePresentWinsOnError: 'abort'` (no env gate). Opt-in `'continue'` only when explicitly set.
- **Async failures:** Stock `timelinePlanner.play()` paths surface rejections via `SpinFlow.surfaceAsyncTimelineFailure`. `awaitSpinDomainTimelineBeforeWinPresentation` no longer swallows `play()` failures.
- **Spin lifecycle layout:** `SpinLifecycleCallbacksConfig` and `stockSpinLifecycleBridges.ts` remain the bridge layer; integration installs them.
- **Vitest:** global `afterEach` resets `PlannerAuthorityLaneRegistry` (`src/test/vitestSetup.ts`) to avoid lane leakage between tests.
- **Docs:** `SKIP_AND_INTERRUPT_CONTRACT.md` / `runtime/README.md` synchronized to code.
- **Planner lane (view):** `enqueueWithResolvedPlannerLane` in `PlannerCommandAuthority.ts`; `EffectLayer` / `ScreenEffects` default to **`presentation`** lane for effect enqueue; `useStockPlannerLaneRegistry` opts into registry resolution; optional `explicitPlannerLaneForEnqueue` overrides the default.

## [1.0.0] - 2026-02-06

### Added
- **SDK Production Core Pack v1** implementation across all systems.
- **Outcome Adapter Architecture**:
  - `NormalizedSpinOutcome` discriminated union for CASCADE, LINES, WAYS, CLUSTER.
  - `OutcomeAdapterRegistry` with deterministic resolution (priority/ambiguity).
  - `FeatureSchemaRegistry` for runtime feature payload validation.
  - `AdapterDiagnosticsReport` for conversion traceability.
- **Fixture Runner & Replay**:
  - `FixturePack` format supporting RAW and NORMALIZED entries.
  - `OutcomeReplayRunner` for deterministic replay of spin outcomes.
  - `stableStringify` for consistent JSON serialization.
- **Skip Standardization**:
  - `SkipPolicy` system (NONE, FAST_FORWARD, SETTLE_NOW).
  - `SkipController` with "Strongest Wins" arbitration.
  - `ISkippableExecution` and `applySkipIfNeeded` for engine integration.
- **Pooling Leak Detection**:
  - `PoolTracker` (DEV-only) for tracking object lifecycle.
  - Leak detection assertions for tests and development.

### Changed
- Refactored SDK entry points to ensure clean public API exports.
- Standardized error codes across `SDKContractError`, `SDKStateError`, and `SDKDevError`.

### Breaking Changes
- Backend responses MUST now be routed through the `OutcomeAdapterRegistry` conversion pipeline.
- Slot lifecycle is owned by `SpinFlow` / `SlotStateMachine` (`SlotState`); parallel `GamePhase` / `PhaseController` were removed from the public SDK surface.
