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

    for (const batch of chunks) {
      const injectedBatch = extraPrompt
        ? batch.map((t) => ({
            ...t,
            prompt: `${t.prompt}\n\n## Additional Instructions (user-provided)\n\n${extraPrompt}`,
          }))
        : batch;

      const batchResults = await Promise.allSettled(injectedBatch.map((t) => this.runOne(t)));
      const batchResolved: SubagentResult[] = [];
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          batchResolved.push(result.value);
        }
      }
      results.push(...batchResolved);

      if (this.hooks?.onBatchComplete) {
        const action = await this.hooks.onBatchComplete(batchResolved);

        if (action.action === 'abort') {
          break;
        }

        if (action.retryTasks && action.retryTasks.length > 0) {
          for (const retrySpec of action.retryTasks) {
            const originalTask = tasks.find((t) => t.id === retrySpec.id);
            if (!originalTask) continue;
            const retryTask: SubagentTask = {
              ...originalTask,
              prompt: `${originalTask.prompt}\n\n## Additional Instructions (user-provided)\n\n${retrySpec.extraPrompt}`,
            };
            const retryResult = await this.runOne(retryTask);
            // Replace the existing result for this id
            const idx = results.findIndex((r) => r.id === retrySpec.id);
            if (idx !== -1) {
              results[idx] = retryResult;
            } else {
              results.push(retryResult);
            }
          }
        }

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
        // Not last engine — try next one
      }
    }

    // Should never reach here, but TypeScript needs it
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
