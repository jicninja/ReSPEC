import * as path from 'node:path';
import * as fs from 'node:fs';
import { loadConfig } from '../config/loader.js';
import { StateManager } from '../state/manager.js';
import { createFormatAdapter } from '../formats/factory.js';
import { analyzedDir, specsDir } from '../utils/fs.js';
import { PHASE_ANALYZED } from '../constants.js';
import { createTUI } from '../tui/factory.js';

export async function runGenerate(
  dir: string,
  options: { only?: string; force?: boolean; auto?: boolean; ci?: boolean }
): Promise<void> {
  const tui = createTUI(options);
  const config = await loadConfig(dir);
  const state = new StateManager(dir);

  if (!options.force) {
    state.requirePhase(PHASE_ANALYZED);
  }

  const format = config.output.format;
  const adapter = createFormatAdapter(format);

  const analyzedPath = analyzedDir(dir);
  const outputDir = specsDir(dir, config.output.dir);

  // Read SDD content if it exists (from previous generate run)
  const sddPath = path.join(outputDir, 'sdd.md');
  const sddContent = fs.existsSync(sddPath)
    ? fs.readFileSync(sddPath, 'utf-8')
    : '';

  const context = {
    projectName: config.project.name,
    projectDescription: config.project.description ?? '',
    sddContent,
    analyzedDir: analyzedPath,
  };

  tui.phaseHeader('GENERATE', `Format: ${format}`);
  tui.progress(`Generating specs using format: ${format}...`);
  await adapter.package(outputDir, outputDir, context);
  tui.success(`Specs written to ${outputDir}`);

  state.completeGenerate({
    generators_run: [format],
    format,
  });

  tui.phaseSummary('GENERATE COMPLETE', [
    { label: format, status: '✓', detail: outputDir },
  ]);

  tui.setPhase('generate');
  tui.writeDecisionLog(path.join(dir, '.respec'));
  tui.destroy();
}
