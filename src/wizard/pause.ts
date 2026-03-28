import type { SubagentResult } from '../ai/types.js';

export type PauseAction = 'resume' | 'add-instructions' | 'view-outputs' | 'retry-task' | 'abort';

export interface PauseMenuOption {
  value: PauseAction;
  label: string;
}

export function buildPauseMenuOptions(completedResults: SubagentResult[]): PauseMenuOption[] {
  const hasSuccessful = completedResults.some(r => r.status === 'success');

  const options: PauseMenuOption[] = [
    { value: 'resume', label: 'Resume' },
    { value: 'add-instructions', label: 'Add instructions for remaining tasks' },
    { value: 'view-outputs', label: 'View outputs so far' },
  ];

  if (hasSuccessful) {
    options.push({ value: 'retry-task', label: 'Retry a task with different instructions' });
  }

  options.push({ value: 'abort', label: 'Abort phase' });

  return options;
}

export function formatOutputPreview(output: string, maxLines = 20): string {
  const lines = output.split('\n');
  if (lines.length <= maxLines) return output;
  return lines.slice(0, maxLines).join('\n') + `\n\n(showing ${maxLines} of ${lines.length} lines)`;
}

export function buildRetryOptions(results: SubagentResult[]): { value: string; label: string }[] {
  return results
    .filter(r => r.status === 'success')
    .map(r => ({
      value: r.id,
      label: `${r.id} (${Math.round(r.durationMs / 1000)}s)`,
    }));
}
