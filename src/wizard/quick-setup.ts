import * as clack from '@clack/prompts';
import * as fs from 'node:fs';
import { join } from 'node:path';
import { stringify as yamlStringify } from 'yaml';
import { detectProject } from '../init/detect.js';
import { OUTPUT_FORMATS, DEFAULT_OUTPUT_FORMAT, CONFIG_FILENAME, RESPEC_DIR } from '../constants.js';

const PROJECT_TYPES = [
  'full system specification',
  'port / migration',
  'refactor',
  'version upgrade',
  'audit / review',
] as const;

export async function runQuickSetup(dir: string): Promise<void> {
  const detected = detectProject(dir);

  clack.log.step(`Detected: ${detected.name}${detected.description ? ` (${detected.description})` : ''}`);

  const format = await clack.select({
    message: 'Output format?',
    options: OUTPUT_FORMATS.map((f) => ({ value: f, label: f })),
    initialValue: DEFAULT_OUTPUT_FORMAT,
  });
  if (clack.isCancel(format)) return;

  const projectType = await clack.select({
    message: 'What type of project is this?',
    options: [
      ...PROJECT_TYPES.map((t) => ({ value: t, label: t })),
      { value: 'custom', label: 'Custom (describe your own)' },
    ],
    initialValue: PROJECT_TYPES[0],
  });
  if (clack.isCancel(projectType)) return;

  let intent: string | undefined;
  if (projectType !== 'full system specification') {
    if (projectType === 'custom') {
      const custom = await clack.text({ message: 'Describe your goal:' });
      if (clack.isCancel(custom)) return;
      intent = custom as string;
    } else {
      intent = projectType as string;
    }
  }

  const config: Record<string, unknown> = {
    project: {
      name: detected.name,
      ...(detected.description && { description: detected.description }),
      ...(intent && { intent }),
    },
    sources: {
      repo: {
        path: '.',
        ...(detected.includes.length > 0 && { include: detected.includes }),
        ...(detected.excludes.length > 0 && { exclude: detected.excludes }),
      },
    },
    output: { format },
  };

  const configPath = join(dir, CONFIG_FILENAME);
  fs.writeFileSync(configPath, yamlStringify(config), 'utf-8');

  const gitignorePath = join(dir, '.gitignore');
  const respecEntry = RESPEC_DIR + '/';
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    if (!content.includes(respecEntry)) {
      fs.appendFileSync(gitignorePath, `\n${respecEntry}\n`);
    }
  }

  clack.log.success(`Config saved to ${CONFIG_FILENAME}`);
}
