/**
 * Validates starter `runtimeShell.hud` using the same public engine APIs as runtime finalize.
 */

import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { resolveSlotRuntimeShellConfig, validateSlotHudConfig } from '@fnx/sl-engine';
import {
  type PipelineIssue,
  type PipelineReport,
  IssueCategory,
  IssueCodes,
  createReport,
} from './pipelineTypes.ts';

export const STARTER_HUD_CONFIG_INDEX = 'src/config/hud/index.ts';

export async function validateStarterHudConfig(projectRoot: string): Promise<PipelineReport> {
  const issues: PipelineIssue[] = [];
  const hudIndexPath = path.join(projectRoot, STARTER_HUD_CONFIG_INDEX);

  if (!fs.existsSync(hudIndexPath)) {
    issues.push({
      code: IssueCodes.HUD_CONFIG_MISSING,
      category: IssueCategory.CONFIG,
      severity: 'error',
      message: `HUD config entry missing: ${STARTER_HUD_CONFIG_INDEX}. Fix: add src/config/hud/ from the SL-Engine starter template or restore the file.`,
      file: STARTER_HUD_CONFIG_INDEX,
    });
    return createReport('hud-config:validate', issues);
  }

  try {
    const mod = (await import(pathToFileURL(hudIndexPath).href)) as {
      runtimeShellConfig?: { hud?: unknown };
      hudConfig?: unknown;
    };
    const hud = mod.runtimeShellConfig?.hud ?? mod.hudConfig;
    if (hud === undefined) {
      issues.push({
        code: IssueCodes.HUD_CONFIG_INVALID,
        category: IssueCategory.CONFIG,
        severity: 'error',
        message: `${STARTER_HUD_CONFIG_INDEX} must export runtimeShellConfig with hud (or export hudConfig).`,
        file: STARTER_HUD_CONFIG_INDEX,
      });
    } else {
      const result = validateSlotHudConfig(hud);
      if (!result.ok) {
        for (const issue of result.issues) {
          issues.push({
            code: IssueCodes.HUD_CONFIG_INVALID,
            category: IssueCategory.CONFIG,
            severity: 'error',
            message: `HUD config invalid: ${issue.path}: ${issue.message}`,
            file: STARTER_HUD_CONFIG_INDEX,
            context: { validationCode: issue.code, path: issue.path },
          });
        }
      } else {
        try {
          resolveSlotRuntimeShellConfig({ hud: hud as never });
        } catch (error) {
          issues.push({
            code: IssueCodes.HUD_CONFIG_INVALID,
            category: IssueCategory.CONFIG,
            severity: 'error',
            message: error instanceof Error ? error.message : String(error),
            file: STARTER_HUD_CONFIG_INDEX,
          });
        }
      }
    }
  } catch (error) {
    issues.push({
      code: IssueCodes.HUD_CONFIG_INVALID,
      category: IssueCategory.CONFIG,
      severity: 'error',
      message: `Failed to load HUD config module: ${error instanceof Error ? error.message : String(error)}`,
      file: STARTER_HUD_CONFIG_INDEX,
    });
  }

  return createReport('hud-config:validate', issues);
}
