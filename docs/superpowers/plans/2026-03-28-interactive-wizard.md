# Interactive Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an interactive wizard mode launched by `respec` (no subcommand) that guides users through the pipeline with contextual menus, autopilot, pause-to-inject-prompts, and retry capabilities.

**Architecture:** New `src/wizard/` module with 5 files. The orchestrator gets an optional `hooks` parameter for pause/inject support. `@clack/prompts` handles all interactive UI. The existing TUI keypress handler signals pause between batches. `bin/respec.ts` gets a default action that launches the wizard.

**Tech Stack:** `@clack/prompts` (interactive UI), `chalk` (already installed, colors), vitest (testing)

---

### Task 1: Install @clack/prompts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the dependency**

```bash
npm install @clack/prompts
```

- [ ] **Step 2: Verify it installed**

Run: `node -e "import('@clack/prompts').then(m => console.log(Object.keys(m).join(', ')))"`
Expected: Lists exports like `intro, outro, select, spinner, text, confirm, isCancel`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @clack/prompts dependency"
```

---

### Task 2: Splash Screen

**Files:**
- Create: `src/wizard/splash.ts`
- Test: `tests/wizard/splash.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/wizard/splash.test.ts
import { describe, it, expect } from 'vitest';
import { buildSplashText } from '../../src/wizard/splash.js';

describe('buildSplashText', () => {
  it('includes ASCII art logo', () => {
    const text = buildSplashText('0.1.0');
    expect(text).toContain('╦═╗╔═╗╔═╗╔═╗╔═╗╔═╗');
    expect(text).toContain('╠╦╝║╣ ╚═╗╠═╝║╣ ║');
    expect(text).toContain('╩╚═╚═╝╚═╝╩  ╚═╝╚═╝');
  });

  it('includes tagline', () => {
    const text = buildSplashText('0.1.0');
    expect(text).toContain('reverse engineering');
  });

  it('includes version', () => {
    const text = buildSplashText('1.2.3');
    expect(text).toContain('v1.2.3');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/wizard/splash.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement splash**

```typescript
// src/wizard/splash.ts
import chalk from 'chalk';
import { TUI_BRAND_COLOR } from '../constants.js';

const LOGO = `
  ╦═╗╔═╗╔═╗╔═╗╔═╗╔═╗
  ╠╦╝║╣ ╚═╗╠═╝║╣ ║
  ╩╚═╚═╝╚═╝╩  ╚═╝╚═╝`;

const TAGLINE = '  reverse engineering → spec';

export function buildSplashText(version: string): string {
  return `${LOGO}\n${TAGLINE}\n\n  v${version}`;
}

export function showSplash(version: string): void {
  const brand = chalk.hex(TUI_BRAND_COLOR);
  console.log(brand(LOGO));
  console.log(chalk.dim(TAGLINE));
  console.log(chalk.dim(`\n  v${version}\n`));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/wizard/splash.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/wizard/splash.ts tests/wizard/splash.test.ts
git commit -m "feat: wizard splash screen with ASCII art logo"
```

---

### Task 3: Menu Builder

**Files:**
- Create: `src/wizard/menu.ts`
- Test: `tests/wizard/menu.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/wizard/menu.test.ts
import { describe, it, expect } from 'vitest';
import { buildMenuOptions } from '../../src/wizard/menu.js';

describe('buildMenuOptions', () => {
  it('offers init when no config exists', () => {
    const options = buildMenuOptions('no-config');
    const values = options.map(o => o.value);
    expect(values).toContain('init');
    expect(values).toContain('exit');
    expect(values).not.toContain('ingest');
  });

  it('offers ingest and autopilot when config exists but empty', () => {
    const options = buildMenuOptions('empty');
    const values = options.map(o => o.value);
    expect(values).toContain('ingest');
    expect(values).toContain('autopilot');
    expect(values).toContain('exit');
  });

  it('offers analyze after ingested', () => {
    const options = buildMenuOptions('ingested');
    const values = options.map(o => o.value);
    expect(values).toContain('analyze');
    expect(values).toContain('autopilot');
    expect(values[0].value || values[0]).toBeDefined();
  });

  it('offers generate after analyzed', () => {
    const options = buildMenuOptions('analyzed');
    const values = options.map(o => o.value);
    expect(values).toContain('generate');
    expect(values).toContain('autopilot');
  });

  it('offers export after generated', () => {
    const options = buildMenuOptions('generated');
    const values = options.map(o => o.value);
    expect(values).toContain('export');
    expect(values).not.toContain('autopilot');
  });

  it('marks the first option as recommended', () => {
    const options = buildMenuOptions('ingested');
    expect(options[0].hint).toContain('recommended');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/wizard/menu.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement menu builder**

```typescript
// src/wizard/menu.ts

export type WizardState = 'no-config' | 'empty' | 'ingested' | 'analyzed' | 'generated';

export type WizardAction =
  | 'init' | 'ingest' | 'analyze' | 'generate' | 'export'
  | 'autopilot' | 'status' | 'validate' | 'exit';

export interface MenuOption {
  value: WizardAction;
  label: string;
  hint?: string;
}

const MENUS: Record<WizardState, { options: Omit<MenuOption, 'hint'>[]; recommended: WizardAction }> = {
  'no-config': {
    recommended: 'init',
    options: [
      { value: 'init', label: 'Initialize project (create config)' },
      { value: 'exit', label: 'Exit' },
    ],
  },
  'empty': {
    recommended: 'ingest',
    options: [
      { value: 'ingest', label: 'Ingest sources' },
      { value: 'autopilot', label: 'Autopilot — run full pipeline' },
      { value: 'status', label: 'View status' },
      { value: 'exit', label: 'Exit' },
    ],
  },
  'ingested': {
    recommended: 'analyze',
    options: [
      { value: 'analyze', label: 'Analyze with AI' },
      { value: 'autopilot', label: 'Autopilot — run remaining pipeline' },
      { value: 'ingest', label: 'Re-ingest sources' },
      { value: 'status', label: 'View status' },
      { value: 'exit', label: 'Exit' },
    ],
  },
  'analyzed': {
    recommended: 'generate',
    options: [
      { value: 'generate', label: 'Generate specs' },
      { value: 'autopilot', label: 'Autopilot — run remaining pipeline' },
      { value: 'analyze', label: 'Re-analyze' },
      { value: 'status', label: 'View status' },
      { value: 'exit', label: 'Exit' },
    ],
  },
  'generated': {
    recommended: 'export',
    options: [
      { value: 'export', label: 'Export to format' },
      { value: 'generate', label: 'Re-generate specs' },
      { value: 'validate', label: 'Validate output' },
      { value: 'status', label: 'View status' },
      { value: 'exit', label: 'Exit' },
    ],
  },
};

export function buildMenuOptions(state: WizardState): MenuOption[] {
  const menu = MENUS[state];
  return menu.options.map((opt) => ({
    ...opt,
    hint: opt.value === menu.recommended ? '(recommended)' : undefined,
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/wizard/menu.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/wizard/menu.ts tests/wizard/menu.test.ts
git commit -m "feat: wizard contextual menu builder"
```

---

### Task 4: Orchestrator Hooks for Pause

**Files:**
- Modify: `src/ai/orchestrator.ts`
- Modify: `src/ai/types.ts`
- Modify: `tests/ai/orchestrator.test.ts`

- [ ] **Step 1: Add types for hooks**

Append to `src/ai/types.ts`:

```typescript
export interface BatchAction {
  action: 'continue' | 'abort';
  extraPrompt?: string;
  retryTasks?: { id: string; extraPrompt: string }[];
}

export interface OrchestratorHooks {
  onBatchComplete?(results: SubagentResult[]): Promise<BatchAction>;
}
```

- [ ] **Step 2: Write failing tests for hooks**

Add to `tests/ai/orchestrator.test.ts`:

```typescript
describe('Orchestrator hooks', () => {
  it('calls onBatchComplete between batches', async () => {
    const engine = makeMockEngine(async () => 'done');
    const onBatchComplete = vi.fn(async () => ({ action: 'continue' as const }));
    const orchestrator = new Orchestrator(
      engine,
      { max_parallel: 2, timeout: 30 },
      undefined,
      { onBatchComplete },
    );

    await orchestrator.runAll(tasks); // 3 tasks, max_parallel 2 = 2 batches
    expect(onBatchComplete).toHaveBeenCalledTimes(2);
  });

  it('aborts remaining batches when hook returns abort', async () => {
    const engine = makeMockEngine(async () => 'done');
    let callCount = 0;
    const onBatchComplete = vi.fn(async () => {
      callCount++;
      return { action: callCount === 1 ? 'abort' as const : 'continue' as const };
    });
    const orchestrator = new Orchestrator(
      engine,
      { max_parallel: 2, timeout: 30 },
      undefined,
      { onBatchComplete },
    );

    const results = await orchestrator.runAll(tasks);
    // Only first batch (2 tasks) should run
    expect(results).toHaveLength(2);
    expect(onBatchComplete).toHaveBeenCalledTimes(1);
  });

  it('injects extraPrompt into remaining tasks', async () => {
    const engine = makeMockEngine(async (prompt) => `echo: ${prompt}`);
    const onBatchComplete = vi.fn(async () => ({
      action: 'continue' as const,
      extraPrompt: 'INJECTED',
    }));
    const orchestrator = new Orchestrator(
      engine,
      { max_parallel: 2, timeout: 30 },
      undefined,
      { onBatchComplete },
    );

    const results = await orchestrator.runAll(tasks);
    // Third task (second batch) should have injected prompt
    const task3 = results.find(r => r.id === 'task-3');
    expect(task3?.output).toContain('INJECTED');
  });

  it('retries tasks when hook returns retryTasks', async () => {
    let runCount = 0;
    const engine = makeMockEngine(async (prompt) => {
      runCount++;
      return `run-${runCount}: ${prompt}`;
    });
    const onBatchComplete = vi.fn()
      .mockResolvedValueOnce({
        action: 'continue',
        retryTasks: [{ id: 'task-1', extraPrompt: 'RETRY_CONTEXT' }],
      })
      .mockResolvedValue({ action: 'continue' });

    const orchestrator = new Orchestrator(
      engine,
      { max_parallel: 2, timeout: 30 },
      undefined,
      { onBatchComplete },
    );

    const results = await orchestrator.runAll(tasks);
    // task-1 should have been retried — last result wins
    const task1Results = results.filter(r => r.id === 'task-1');
    expect(task1Results).toHaveLength(1);
    expect(task1Results[0].output).toContain('RETRY_CONTEXT');
  });

  it('works without hooks (backwards compat)', async () => {
    const engine = makeMockEngine(async () => 'done');
    const orchestrator = new Orchestrator(engine, { max_parallel: 4, timeout: 30 });

    const results = await orchestrator.runAll(tasks);
    expect(results).toHaveLength(3);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/ai/orchestrator.test.ts`
Expected: FAIL — constructor doesn't accept 4th arg

- [ ] **Step 4: Update orchestrator to support hooks**

Replace `src/ai/orchestrator.ts`:

```typescript
import type { AIEngine, SubagentTask, SubagentResult, EngineConfig, OrchestratorHooks } from './types.js';

export class Orchestrator {
  private readonly engines: AIEngine[];

  constructor(
    engines: AIEngine | AIEngine[],
    private readonly config: { max_parallel: number; timeout: number },
    private readonly engineConfigs?: Record<string, EngineConfig>,
    private readonly hooks?: OrchestratorHooks,
  ) {
    this.engines = Array.isArray(engines) ? engines : [engines];
  }

  async runAll(tasks: SubagentTask[]): Promise<SubagentResult[]> {
    const results: SubagentResult[] = [];
    const chunks = this.chunk(tasks, this.config.max_parallel);
    let extraPrompt: string | undefined;

    for (let ci = 0; ci < chunks.length; ci++) {
      const batch = chunks[ci];

      // Apply extra prompt to tasks if injected from previous hook
      const batchTasks = extraPrompt
        ? batch.map(t => ({ ...t, prompt: `${t.prompt}\n\n## Additional Instructions (user-provided)\n\n${extraPrompt}` }))
        : batch;

      const batchResults = await Promise.allSettled(batchTasks.map((t) => this.runOne(t)));
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      }

      // Call hook after batch
      if (this.hooks?.onBatchComplete) {
        const batchCompleted = batchResults
          .filter((r): r is PromiseFulfilledResult<SubagentResult> => r.status === 'fulfilled')
          .map(r => r.value);
        const action = await this.hooks.onBatchComplete(batchCompleted);

        if (action.action === 'abort') break;

        // Handle retries
        if (action.retryTasks && action.retryTasks.length > 0) {
          for (const retry of action.retryTasks) {
            const originalTask = batch.find(t => t.id === retry.id);
            if (!originalTask) continue;

            const retryTask: SubagentTask = {
              ...originalTask,
              prompt: `${originalTask.prompt}\n\n## Additional Instructions (user-provided)\n\n${retry.extraPrompt}`,
            };

            const retryResult = await this.runOne(retryTask);
            // Replace the original result
            const idx = results.findIndex(r => r.id === retry.id);
            if (idx !== -1) results[idx] = retryResult;
            else results.push(retryResult);
          }
        }

        // Store extraPrompt for remaining batches
        if (action.extraPrompt) {
          extraPrompt = action.extraPrompt;
        }
      }
    }

    return results;
  }

  private async runOne(task: SubagentTask): Promise<SubagentResult> {
    const start = Date.now();

    for (let i = 0; i < this.engines.length; i++) {
      const engine = this.engines[i];
      const isLast = i === this.engines.length - 1;

      try {
        const perEngine = this.engineConfigs?.[engine.name] ?? {};
        const output = await engine.run(task.prompt, {
          timeout: perEngine.timeout ?? this.config.timeout,
          model: perEngine.model,
        });
        return {
          id: task.id,
          status: 'success',
          output,
          engine: engine.name,
          durationMs: Date.now() - start,
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);

        if (isLast) {
          const status = error.includes('TIMEOUT') ? 'timeout' : 'failure';
          return {
            id: task.id,
            status,
            error,
            engine: engine.name,
            durationMs: Date.now() - start,
          };
        }
      }
    }

    return {
      id: task.id,
      status: 'failure',
      error: 'No engines available',
      durationMs: Date.now() - start,
    };
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
}
```

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add src/ai/orchestrator.ts src/ai/types.ts tests/ai/orchestrator.test.ts
git commit -m "feat: orchestrator hooks for pause, prompt injection, and retry"
```

---

### Task 5: Pause Menu

**Files:**
- Create: `src/wizard/pause.ts`
- Test: `tests/wizard/pause.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/wizard/pause.test.ts
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

  it('disables retry when no successful tasks', () => {
    const results: SubagentResult[] = [
      { id: 'task-1', status: 'failure', error: 'fail', durationMs: 100 },
    ];
    const options = buildPauseMenuOptions(results);
    const retry = options.find(o => o.value === 'retry-task');
    expect(retry).toBeUndefined();
  });
});

describe('formatOutputPreview', () => {
  it('truncates output to maxLines', () => {
    const lines = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`).join('\n');
    const preview = formatOutputPreview(lines, 20);
    expect(preview.split('\n').length).toBeLessThanOrEqual(21); // 20 lines + truncation notice
  });

  it('shows full output when short', () => {
    const preview = formatOutputPreview('Short output', 20);
    expect(preview).toBe('Short output');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/wizard/pause.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement pause module**

```typescript
// src/wizard/pause.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/wizard/pause.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/wizard/pause.ts tests/wizard/pause.test.ts
git commit -m "feat: pause menu builder with output preview and retry options"
```

---

### Task 6: Command Runner with Spinner and Pause

**Files:**
- Create: `src/wizard/runner.ts`
- Test: `tests/wizard/runner.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/wizard/runner.test.ts
import { describe, it, expect } from 'vitest';
import { getAutopilotSteps } from '../../src/wizard/runner.js';

describe('getAutopilotSteps', () => {
  it('returns full pipeline from empty state', () => {
    const steps = getAutopilotSteps('empty');
    expect(steps).toEqual(['ingest', 'analyze', 'generate', 'export']);
  });

  it('returns remaining steps from ingested', () => {
    const steps = getAutopilotSteps('ingested');
    expect(steps).toEqual(['analyze', 'generate', 'export']);
  });

  it('returns remaining steps from analyzed', () => {
    const steps = getAutopilotSteps('analyzed');
    expect(steps).toEqual(['generate', 'export']);
  });

  it('returns empty from generated', () => {
    const steps = getAutopilotSteps('generated');
    expect(steps).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/wizard/runner.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement runner**

```typescript
// src/wizard/runner.ts
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
  try {
    await fn();
    s.stop(`${label} — done`);
    return { ok: true };
  } catch (err) {
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/wizard/runner.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/wizard/runner.ts tests/wizard/runner.test.ts
git commit -m "feat: wizard command runner with spinner and autopilot"
```

---

### Task 7: Wizard Main Loop

**Files:**
- Create: `src/wizard/index.ts`

- [ ] **Step 1: Implement the main wizard loop**

```typescript
// src/wizard/index.ts
import * as clack from '@clack/prompts';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { showSplash } from './splash.js';
import { buildMenuOptions, type WizardState, type WizardAction } from './menu.js';
import { runAutopilot, runWithSpinner } from './runner.js';
import { StateManager } from '../state/manager.js';
import { CONFIG_FILENAME } from '../constants.js';
import type { PipelinePhase } from '../state/types.js';

// Lazy imports to avoid loading everything upfront
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
    // Read from package.json at runtime
    const { createRequire } = await import('node:module');
    // ESM workaround: use import.meta.url if available
    return '0.1.0'; // fallback, will be replaced in step 2
  } catch {
    return '0.1.0';
  }
}

export async function runWizard(dir: string): Promise<void> {
  showSplash('0.1.0');
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
```

- [ ] **Step 2: Fix version reading**

Replace the `getVersion` function and the `showSplash('0.1.0')` call. Read version from `package.json` using `fs.readFileSync` + `JSON.parse` with a path relative to the module:

```typescript
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join as pathJoin } from 'node:path';

function getVersion(): string {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const pkgPath = pathJoin(__dirname, '..', '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}
```

And call `showSplash(getVersion())` instead of `showSplash('0.1.0')`.

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git add src/wizard/index.ts
git commit -m "feat: wizard main loop with state detection and menu cycle"
```

---

### Task 8: Wire Wizard into bin/respec.ts

**Files:**
- Modify: `bin/respec.ts:96`

- [ ] **Step 1: Add default action before `program.parse()`**

In `bin/respec.ts`, add a default action before line 96 (`program.parse()`):

```typescript
// Default action: no subcommand → wizard
program.action(wrapAction(async () => {
  const { runWizard } = await import('../src/wizard/index.js');
  await runWizard(process.cwd());
}));

program.parse();
```

- [ ] **Step 2: Build and test manually**

```bash
npm run build
node dist/bin/respec.js
```

Expected: Shows splash screen and menu. Press Ctrl+C to exit.

- [ ] **Step 3: Verify existing commands still work**

```bash
node dist/bin/respec.js status --ci
node dist/bin/respec.js --help
```

Expected: Both work as before.

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add bin/respec.ts
git commit -m "feat: wire wizard as default action for respec command"
```

---

### Task 9: Integration — Pause Hook in Analyze/Generate

**Files:**
- Modify: `src/commands/analyze.ts`
- Modify: `src/commands/generate.ts`

This task connects the orchestrator hooks to the existing commands so pause works when running analyze/generate from the wizard. The hooks are only registered when NOT in CI mode.

- [ ] **Step 1: Create a shared hook factory**

Create `src/wizard/hooks.ts`:

```typescript
// src/wizard/hooks.ts
import * as clack from '@clack/prompts';
import type { SubagentResult, BatchAction, OrchestratorHooks } from '../ai/types.js';
import { buildPauseMenuOptions, formatOutputPreview, buildRetryOptions } from './pause.js';

let pauseRequested = false;

export function requestPause(): void {
  pauseRequested = true;
}

export function createInteractiveHooks(): OrchestratorHooks {
  return {
    async onBatchComplete(results: SubagentResult[]): Promise<BatchAction> {
      if (!pauseRequested) return { action: 'continue' };
      pauseRequested = false;

      clack.log.warn('Paused');

      const options = buildPauseMenuOptions(results);

      const choice = await clack.select({
        message: 'What do you want to do?',
        options: options.map(o => ({ value: o.value, label: o.label })),
      });

      if (clack.isCancel(choice) || choice === 'abort') {
        return { action: 'abort' };
      }

      if (choice === 'resume') {
        return { action: 'continue' };
      }

      if (choice === 'add-instructions') {
        const instructions = await clack.text({
          message: 'Additional instructions for remaining tasks:',
          placeholder: 'e.g., Focus on the payment flow...',
        });
        if (clack.isCancel(instructions)) return { action: 'continue' };
        return { action: 'continue', extraPrompt: instructions as string };
      }

      if (choice === 'view-outputs') {
        const outputOptions = results
          .filter(r => r.status === 'success' && r.output)
          .map(r => ({ value: r.id, label: `${r.id} (${Math.round(r.durationMs / 1000)}s)` }));

        if (outputOptions.length === 0) {
          clack.log.info('No outputs to view.');
        } else {
          const selected = await clack.select({
            message: 'Which output to view?',
            options: outputOptions,
          });
          if (!clack.isCancel(selected)) {
            const result = results.find(r => r.id === selected);
            if (result?.output) {
              clack.log.info(`── ${result.id} output ──\n\n${formatOutputPreview(result.output)}`);
            }
          }
        }
        // After viewing, show pause menu again (recursive)
        return this.onBatchComplete!(results);
      }

      if (choice === 'retry-task') {
        const retryOptions = buildRetryOptions(results);
        const selected = await clack.select({
          message: 'Which task to retry?',
          options: retryOptions,
        });
        if (clack.isCancel(selected)) return { action: 'continue' };

        const instructions = await clack.text({
          message: `Additional instructions for ${selected}:`,
          placeholder: 'e.g., Focus on the authentication module...',
        });
        if (clack.isCancel(instructions)) return { action: 'continue' };

        return {
          action: 'continue',
          retryTasks: [{ id: selected as string, extraPrompt: instructions as string }],
        };
      }

      return { action: 'continue' };
    },
  };
}
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add src/wizard/hooks.ts
git commit -m "feat: interactive pause hooks with prompt injection and retry"
```

---

### Task 10: Build, Manual Test, Final Commit

**Files:**
- None (build + test)

- [ ] **Step 1: Build**

```bash
npm run build
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 3: Manual smoke test**

```bash
cd /tmp && mkdir test-wizard && cd test-wizard
respec
```

Expected:
1. Shows ASCII art splash with orange color
2. Shows menu: "Init, Exit"
3. Select Init → creates config
4. Shows menu: "Ingest, Autopilot, Status, Exit"
5. Select Exit → shows "Goodbye!"

- [ ] **Step 4: Verify existing commands unchanged**

```bash
cd /Users/ignaciocastro/Odaclick/docupaint-web-admin
respec status --ci
respec validate --phase raw
```

Expected: Both work exactly as before.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: interactive wizard with autopilot, pause, and prompt injection"
```
