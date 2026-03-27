import { StateManager } from '../state/manager.js';

export async function runStatus(
  dir: string,
  options: { verbose?: boolean }
): Promise<void> {
  const state = new StateManager(dir);
  const pipeline = state.load();

  console.log(`\nReSpec Pipeline Status`);
  console.log(`======================`);
  console.log(`Current phase: ${pipeline.phase}`);
  console.log('');

  if (pipeline.ingest) {
    console.log(`[ingested] Ingest completed at: ${pipeline.ingest.completed_at}`);
    if (options.verbose) {
      console.log(`  Sources:`);
      console.log(`    repo: ${pipeline.ingest.sources.repo ? 'yes' : 'no'}`);
      console.log(`    jira: ${pipeline.ingest.sources.jira ? 'yes' : 'no'}`);
      console.log(`    docs: ${pipeline.ingest.sources.docs ? 'yes' : 'no'}`);
      console.log(`  Stats:`);
      console.log(`    files:   ${pipeline.ingest.stats.files}`);
      console.log(`    tickets: ${pipeline.ingest.stats.tickets}`);
      console.log(`    pages:   ${pipeline.ingest.stats.pages}`);
    }
  } else {
    console.log(`[ingested] Not yet run. Use: respec ingest`);
  }

  console.log('');

  if (pipeline.analyze) {
    console.log(`[analyzed] Analyze completed at: ${pipeline.analyze.completed_at}`);
    if (options.verbose) {
      console.log(`  Analyzers run: ${pipeline.analyze.analyzers_run.join(', ')}`);
      console.log(`  Confidence:`);
      for (const [key, value] of Object.entries(pipeline.analyze.confidence)) {
        console.log(`    ${key}: ${(value * 100).toFixed(0)}%`);
      }
    }
  } else {
    console.log(`[analyzed] Not yet run. Use: respec analyze`);
  }

  console.log('');

  if (pipeline.generate) {
    console.log(`[generated] Generate completed at: ${pipeline.generate.completed_at}`);
    if (options.verbose) {
      console.log(`  Format:         ${pipeline.generate.format}`);
      console.log(`  Generators run: ${pipeline.generate.generators_run.join(', ')}`);
    }
  } else {
    console.log(`[generated] Not yet run. Use: respec generate`);
  }

  console.log('');
}
