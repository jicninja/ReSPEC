import { describe, it, expect } from 'vitest';
import { buildPauseMenuOptions, formatOutputPreview } from '../../src/wizard/pause.js';
import type { SubagentResult } from '../../src/ai/types.js';

describe('buildPauseMenuOptions', () => {
  it('includes resume, add instructions, view outputs, retry, and abort', () => {
    const results: SubagentResult[] = [
      { id: 'task-1', status: 'success', output: 'data', durationMs: 100 },
    ];
    const options = buildPauseMenuOptions(results);
    const values = options.map(o => o.value);
    expect(values).toContain('resume');
    expect(values).toContain('add-instructions');
    expect(values).toContain('view-outputs');
    expect(values).toContain('retry-task');
    expect(values).toContain('abort');
  });

  it('excludes retry when no successful tasks', () => {
    const results: SubagentResult[] = [
      { id: 'task-1', status: 'failure', error: 'fail', durationMs: 100 },
    ];
    const options = buildPauseMenuOptions(results);
    const values = options.map(o => o.value);
    expect(values).not.toContain('retry-task');
  });
});

describe('formatOutputPreview', () => {
  it('truncates output to maxLines', () => {
    const lines = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`).join('\n');
    const preview = formatOutputPreview(lines, 20);
    const previewLines = preview.split('\n');
    expect(previewLines.length).toBeLessThanOrEqual(22); // 20 lines + blank + truncation notice
  });

  it('shows full output when short', () => {
    const preview = formatOutputPreview('Short output', 20);
    expect(preview).toBe('Short output');
  });
});
