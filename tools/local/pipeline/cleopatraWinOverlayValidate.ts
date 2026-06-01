import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  calculateWinOverlayRuleDuration,
  createClassicLineWinPresentation,
  profileUsesIntentOwnedOverlayLayer,
  resolveWinOverlayCompositionRule,
  validateWinPresentationIntent,
  type WinPresentationIntent,
} from '@fnx/sl-engine';
import { cleopatraWinOverlayPresentation } from '../../../src/config/cleopatraWinOverlayPresentation.ts';
import {
  IssueCategory,
  IssueCodes,
  createReport,
  type PipelineIssue,
} from './pipelineTypes.ts';

const TEMPLATE_CONFIG_FILE = 'src/config/templateGameConfig.ts';
const OVERLAY_CONFIG_FILE = 'src/config/cleopatraWinOverlayPresentation.ts';

/** Must stay aligned with `templateGameConfig.ts` winPresentationIntent.timing. */
const CLEOPATRA_WIN_PRESENTATION_INTENT: WinPresentationIntent = {
  preset: 'classicLine',
  intensity: 'balanced',
  symbolFeedback: 'clipWithOverlay',
  lineFeedback: 'payline',
  amountText: 'none',
  winOverlay: cleopatraWinOverlayPresentation,
  timing: {
    defaultStepTiming: {
      individualWinDurationMs: 5300,
      allWinsDurationMs: 5500,
      betweenStepsDelayMs: 100,
    },
    tierStepTiming: {
      good: { individualWinDurationMs: 7500, allWinsDurationMs: 7600, betweenStepsDelayMs: 100 },
      big: { individualWinDurationMs: 10300, allWinsDurationMs: 10500, betweenStepsDelayMs: 125 },
      mega: { individualWinDurationMs: 13700, allWinsDurationMs: 14000, betweenStepsDelayMs: 160 },
      epic: { individualWinDurationMs: 17000, allWinsDurationMs: 17500, betweenStepsDelayMs: 200 },
    },
  },
  layout: {
    showPaylines: true,
  },
};

const PROOF_TIERS = ['normal', 'good', 'big', 'mega', 'epic'] as const;

function addIssue(
  issues: PipelineIssue[],
  message: string,
  field: string,
  exampleFix: string,
): void {
  issues.push({
    code: IssueCodes.CONFIG_INVALID,
    category: IssueCategory.CONFIG,
    severity: 'error',
    message: `${message} Fix: ${exampleFix}`,
    file: TEMPLATE_CONFIG_FILE,
    context: { field },
  });
}

function readProjectFile(projectRoot: string, relativePath: string): string {
  return readFileSync(resolve(projectRoot, relativePath), 'utf8');
}

function assertSourceDoesNotUseRemovedWinTextComposition(
  issues: PipelineIssue[],
  projectRoot: string,
): void {
  const templateSource = readProjectFile(projectRoot, TEMPLATE_CONFIG_FILE);
  const overlaySource = readProjectFile(projectRoot, OVERLAY_CONFIG_FILE);

  if (templateSource.includes('cleopatraWinTextPresentation')) {
    addIssue(
      issues,
      'Removed cleopatraWinTextPresentation import/reference found in template config.',
      'winPresentationIntent',
      'use cleopatraWinOverlayPresentation with amountText: "none".',
    );
  }

  if (/winPresentationIntent[\s\S]*?\bwinText\s*:/.test(templateSource)) {
    addIssue(
      issues,
      'winPresentationIntent.winText composition field is removed; Cleopatra must author winOverlay only.',
      'winPresentationIntent.winText',
      'remove winText and keep winOverlay.',
    );
  }

  if (!templateSource.includes('cleopatraWinOverlayPresentation')) {
    addIssue(
      issues,
      'templateGameConfig must import cleopatraWinOverlayPresentation for winOverlay composition.',
      'winPresentationIntent.winOverlay',
      'wire winOverlay: cleopatraWinOverlayPresentation with amountText: "none".',
    );
  }

  if (
    !templateSource.includes("amountText: 'none'")
    && !templateSource.includes('amountText: "none"')
  ) {
    addIssue(
      issues,
      'Cleopatra winOverlay requires amountText: "none" for single authority.',
      'winPresentationIntent.amountText',
      'set amountText to "none" when winOverlay is authored.',
    );
  }

  for (const forbidden of ['type: \'sprite\'', 'type: "sprite"', 'type: \'panel\'', 'type: "panel"'] as const) {
    if (overlaySource.includes(forbidden)) {
      addIssue(
        issues,
        `Phase E1.2 Cleopatra proof is text-only; ${forbidden} found in overlay composition (defer sprites/panels to post-proof polish).`,
        'winOverlay.elements',
        'keep E1.2 proof on text/bitmapText until runtime visual proof lands.',
      );
    }
  }
}

function assertResolvedProfileUsesWinOverlayOnly(issues: PipelineIssue[]): void {
  const validation = validateWinPresentationIntent(CLEOPATRA_WIN_PRESENTATION_INTENT, {
    pathPrefix: 'winPresentationIntent.',
  });
  for (const issue of validation.errors) {
    addIssue(issues, issue.message, issue.path, 'fix winPresentationIntent authoring.');
  }

  const profile = createClassicLineWinPresentation({
    intensity: CLEOPATRA_WIN_PRESENTATION_INTENT.intensity,
    symbolFeedback: CLEOPATRA_WIN_PRESENTATION_INTENT.symbolFeedback,
    lineFeedback: CLEOPATRA_WIN_PRESENTATION_INTENT.lineFeedback,
    amountText: CLEOPATRA_WIN_PRESENTATION_INTENT.amountText,
    winOverlay: CLEOPATRA_WIN_PRESENTATION_INTENT.winOverlay,
    timing: CLEOPATRA_WIN_PRESENTATION_INTENT.timing,
    layout: CLEOPATRA_WIN_PRESENTATION_INTENT.layout,
  });
  const layerTypes = profile.overlay.layers?.map((layer) => layer.type) ?? [];

  if (layerTypes.includes('amountText')) {
    addIssue(
      issues,
      'Resolved profile must not emit amountText overlay layer when winOverlay is active.',
      'winPresentationIntent',
      'keep amountText: "none" and winOverlay authored.',
    );
  }

  if (!layerTypes.includes('winOverlay')) {
    addIssue(
      issues,
      'Resolved profile must emit winOverlay overlay layer for Cleopatra composition.',
      'winPresentationIntent.winOverlay',
      'ensure winOverlay intent resolves through createClassicLineWinPresentation.',
    );
  }

  if (layerTypes.includes('winText' as never)) {
    addIssue(
      issues,
      'Removed winText overlay layer type must not appear in resolved profile.',
      'winPresentationIntent',
      'migrate to winOverlay composition layer only.',
    );
  }

  if (!profileUsesIntentOwnedOverlayLayer(profile.overlay.layers ?? [])) {
    addIssue(
      issues,
      'Profile must use intent-owned winOverlay overlay layers (not stock amountText preset).',
      'winPresentationIntent.winOverlay',
      'ensure composeWinPresentationOverrides applies overlay layer cutover.',
    );
  }
}

function assertTierOverlayDurationsFitStepTiming(issues: PipelineIssue[]): void {
  const timing = CLEOPATRA_WIN_PRESENTATION_INTENT.timing;
  const defaultStepMs = timing?.defaultStepTiming?.individualWinDurationMs ?? 0;

  for (const tierId of PROOF_TIERS) {
    const rule = resolveWinOverlayCompositionRule(cleopatraWinOverlayPresentation, {
      tierId,
      stepKind: 'group',
    });
    if (rule == null) {
      addIssue(
        issues,
        `No winOverlay rule resolved for tier "${tierId}".`,
        `winOverlay.byTier.${tierId}`,
        'define default or byTier winOverlay rule for each stock tier.',
      );
      continue;
    }

    const overlayDurationMs = calculateWinOverlayRuleDuration(rule);
    const stepMs = timing?.tierStepTiming?.[tierId]?.individualWinDurationMs ?? defaultStepMs;

    if (overlayDurationMs > stepMs) {
      addIssue(
        issues,
        `winOverlay duration ${overlayDurationMs}ms exceeds tier "${tierId}" individualWinDurationMs ${stepMs}ms (would trigger WIN_OVERLAY_STEP_LAYER_TOO_LONG).`,
        `winPresentationIntent.timing.tierStepTiming.${tierId}`,
        'increase tier step timing or shorten winOverlay timeline for that tier.',
      );
    }

    if (!Object.keys(rule.elements).includes('amount')) {
      addIssue(
        issues,
        `Tier "${tierId}" winOverlay must define an amount element.`,
        `winOverlay.byTier.${tierId}.elements`,
        'author amount text + countTo timeline for each tier.',
      );
    }
  }
}

export function validateCleopatraWinOverlayProof(projectRoot: string): ReturnType<typeof createReport> {
  const issues: PipelineIssue[] = [];

  assertSourceDoesNotUseRemovedWinTextComposition(issues, projectRoot);
  assertResolvedProfileUsesWinOverlayOnly(issues);
  assertTierOverlayDurationsFitStepTiming(issues);

  return createReport('cleopatra-win-overlay:validate', issues, {
    proofTiers: [...PROOF_TIERS],
    authority: 'amountText:none + winOverlay',
  });
}
