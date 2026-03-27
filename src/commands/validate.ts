import * as fs from 'node:fs';
import * as path from 'node:path';

const RAW_KEY_FILES = [
  'repo/structure.md',
  'repo/dependencies.md',
  'repo/endpoints.md',
  'repo/models.md',
  'repo/env-vars.md',
  '_manifest.md',
];

const ANALYZED_KEY_FILES = [
  'domain/entities.md',
  'domain/bounded-contexts.md',
  'flows/user-flows.md',
  'infra/architecture.md',
  '_analysis-report.md',
];

const SPECS_KEY_FILES = [
  'sdd.md',
];

export async function runValidate(
  dir: string,
  options: { phase?: string }
): Promise<void> {
  const respecDir = path.join(dir, '.respec');
  const rawPath = path.join(respecDir, 'raw');
  const analyzedPath = path.join(respecDir, 'analyzed');

  const phaseFilter = options.phase;
  let hasErrors = false;

  function checkDir(label: string, dirPath: string, keyFiles: string[]): void {
    console.log(`\nChecking ${label} (${dirPath}):`);

    if (!fs.existsSync(dirPath)) {
      console.log(`  ERROR: Directory does not exist`);
      hasErrors = true;
      return;
    }

    for (const relFile of keyFiles) {
      const fullPath = path.join(dirPath, relFile);
      if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        const size = stat.size;
        if (size === 0) {
          console.log(`  WARN:  ${relFile} (empty file)`);
        } else {
          console.log(`  OK:    ${relFile} (${size} bytes)`);
        }
      } else {
        console.log(`  MISS:  ${relFile} (not found)`);
        hasErrors = true;
      }
    }
  }

  console.log(`\nReSpec Validation`);
  console.log(`=================`);

  if (!phaseFilter || phaseFilter === 'raw') {
    checkDir('raw phase', rawPath, RAW_KEY_FILES);
  }

  if (!phaseFilter || phaseFilter === 'analyzed') {
    checkDir('analyzed phase', analyzedPath, ANALYZED_KEY_FILES);
  }

  if (!phaseFilter || phaseFilter === 'specs') {
    // Specs dir comes from config, use a default fallback
    const specsPath = path.join(dir, 'specs');
    checkDir('specs phase', specsPath, SPECS_KEY_FILES);
  }

  console.log('');
  if (hasErrors) {
    console.log('Validation FAILED — some expected files are missing.');
    process.exit(1);
  } else {
    console.log('Validation PASSED — all expected files present.');
  }
}
