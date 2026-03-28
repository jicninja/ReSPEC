import * as clack from '@clack/prompts';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { showSplash } from './splash.js';
import { buildMenuOptions, type WizardState, type WizardAction } from './menu.js';
import { runAutopilot, runWithSpinner } from './runner.js';
import { StateManager } from '../state/manager.js';
import { CONFIG_FILENAME } from '../constants.js';
import type { PipelinePhase } from '../state/types.js';

async function executeCommand(command: string, dir: string): Promise<void> {
  switch (command) {
    case 'init': {
      const { runInit } = await import('../commands/init.js');
      await runInit(dir);
      break;
    }
    case 'ingest': {
      const { runIngest } = await import('../commands/ingest.js');
      await runIngest(dir, { ci: true, force: true });
      break;
    }
    case 'analyze': {
      const { runAnalyze } = await import('../commands/analyze.js');
      await runAnalyze(dir, { ci: true, force: true });
      break;
    }
    case 'generate': {
      const { runGenerate } = await import('../commands/generate.js');
      await runGenerate(dir, { ci: true, force: true });
      break;
    }
    case 'export': {
      const { runExport } = await import('../commands/export.js');
      await runExport(dir, {});
      break;
    }
    case 'status': {
      const { runStatus } = await import('../commands/status.js');
      await runStatus(dir, { verbose: true, ci: true });
      break;
    }
    case 'validate': {
      const { runValidate } = await import('../commands/validate.js');
      await runValidate(dir, {});
      break;
    }
  }
}

function detectState(dir: string): WizardState {
  const configPath = join(dir, CONFIG_FILENAME);
  if (!existsSync(configPath)) return 'no-config';

  const state = new StateManager(dir);
  const pipeline = state.load();

  const phaseMap: Record<PipelinePhase, WizardState> = {
    'empty': 'empty',
    'ingested': 'ingested',
    'analyzed': 'analyzed',
    'generated': 'generated',
  };

  return phaseMap[pipeline.phase] ?? 'empty';
}

function getVersion(): string {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const pkgPath = join(__dirname, '..', '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export async function runWizard(dir: string): Promise<void> {
  showSplash(getVersion());
  clack.intro('');

  let running = true;
  while (running) {
    const state = detectState(dir);
    const options = buildMenuOptions(state);

    const choice = await clack.select({
      message: `Pipeline: ${state}. What's next?`,
      options: options.map(o => ({
        value: o.value,
        label: o.label,
        hint: o.hint,
      })),
    });

    if (clack.isCancel(choice) || choice === 'exit') {
      running = false;
      break;
    }

    const action = choice as WizardAction;

    if (action === 'autopilot') {
      await runAutopilot(dir, state, executeCommand);
      continue;
    }

    if (action === 'status' || action === 'validate') {
      await executeCommand(action, dir);
      continue;
    }

    const result = await runWithSpinner(
      action,
      () => executeCommand(action, dir),
    );

    if (!result.ok) {
      clack.log.error(`${action} failed: ${result.error}`);
    }
  }

  clack.outro('Goodbye!');
}
