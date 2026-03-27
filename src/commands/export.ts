import * as path from 'node:path';
import * as fs from 'node:fs';
import { loadConfig } from '../config/loader.js';
import { createFormatAdapter } from '../formats/factory.js';
import { analyzedDir, specsDir } from '../utils/fs.js';

export async function runExport(
  dir: string,
  options: { format?: string; output?: string }
): Promise<void> {
  const config = await loadConfig(dir);

  const format = options.format ?? config.output.format;
  const adapter = createFormatAdapter(format);

  const analyzedPath = analyzedDir(dir);
  const inputDir = specsDir(dir, config.output.dir);
  const outputDir = options.output
    ? path.resolve(dir, options.output)
    : inputDir;

  // Read SDD content if it exists
  const sddPath = path.join(inputDir, 'sdd.md');
  const sddContent = fs.existsSync(sddPath)
    ? fs.readFileSync(sddPath, 'utf-8')
    : '';

  const context = {
    projectName: config.project.name,
    projectDescription: config.project.description ?? '',
    sddContent,
    analyzedDir: analyzedPath,
  };

  console.log(`Exporting specs with format: ${format} to ${outputDir}`);
  await adapter.package(inputDir, outputDir, context);

  console.log(`Export complete. Output: ${outputDir}`);
}
