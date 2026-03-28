import * as clack from '@clack/prompts';
import type { WizardState } from './menu.js';

const PIPELINE_ORDER = ['ingest', 'analyze', 'generate', 'export'] as const;

const STATE_TO_INDEX: Record<WizardState, number> = {
  'no-config': -1,
  'empty': 0,
  'ingested': 1,
  'analyzed': 2,
  'generated': 4,
};

export function getAutopilotSteps(state: WizardState): string[] {
  const startIndex = STATE_TO_INDEX[state];
  if (startIndex >= PIPELINE_ORDER.length) return [];
  return PIPELINE_ORDER.slice(startIndex) as string[];
}

export async function runWithSpinner(
  label: string,
  fn: () => Promise<void>,
): Promise<{ ok: boolean; error?: string }> {
  const s = clack.spinner();
  s.start(label);

  // Suppress stdout/stderr from underlying commands — wizard owns the UI
  const origWrite = process.stdout.write.bind(process.stdout);
  const origErr = process.stderr.write.bind(process.stderr);
  process.stdout.write = () => true;
  process.stderr.write = () => true;

  try {
    await fn();
    process.stdout.write = origWrite;
    process.stderr.write = origErr;
    s.stop(`${label} — done`);
    return { ok: true };
  } catch (err) {
    process.stdout.write = origWrite;
    process.stderr.write = origErr;
    const message = err instanceof Error ? err.message : String(err);
    s.stop(`${label} — failed: ${message}`);
    return { ok: false, error: message };
  }
}

export async function runAutopilot(
  dir: string,
  state: WizardState,
  executeCommand: (command: string, dir: string) => Promise<void>,
): Promise<void> {
  const steps = getAutopilotSteps(state);
  const total = steps.length;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const label = `[${i + 1}/${total}] ${step}`;
    const result = await runWithSpinner(label, () => executeCommand(step, dir));
    if (!result.ok) {
      clack.log.error(`${step} failed: ${result.error}`);
      break;
    }
  }
}
