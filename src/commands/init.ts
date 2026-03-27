import * as fs from 'node:fs';
import * as path from 'node:path';
import { stringify } from 'yaml';

export async function runInit(dir: string): Promise<void> {
  const configPath = path.join(dir, 'respec.config.yaml');

  if (fs.existsSync(configPath)) {
    console.log(`respec.config.yaml already exists at ${configPath}`);
    return;
  }

  const defaultConfig = {
    project: {
      name: 'my-project',
      version: '1.0',
      description: 'Describe your project here',
    },
    sources: {
      repo: {
        path: './',
        branch: 'main',
        role: 'primary',
        include: ['src/**'],
        exclude: ['node_modules/**', 'dist/**', '.git/**'],
      },
    },
    ai: {
      engine: 'claude',
      max_parallel: 4,
      timeout: 300,
    },
    output: {
      dir: './specs',
      format: 'openspec',
      diagrams: 'mermaid',
      tasks: true,
    },
  };

  const yamlContent = stringify(defaultConfig);
  fs.writeFileSync(configPath, yamlContent, 'utf-8');
  console.log(`Created respec.config.yaml at ${configPath}`);

  // Add .respec/ to .gitignore if not already present
  const gitignorePath = path.join(dir, '.gitignore');
  const respecEntry = '.respec/';

  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    if (!content.includes(respecEntry)) {
      const updated = content.endsWith('\n')
        ? content + respecEntry + '\n'
        : content + '\n' + respecEntry + '\n';
      fs.writeFileSync(gitignorePath, updated, 'utf-8');
      console.log(`Added ${respecEntry} to .gitignore`);
    } else {
      console.log(`.gitignore already contains ${respecEntry}`);
    }
  } else {
    fs.writeFileSync(gitignorePath, respecEntry + '\n', 'utf-8');
    console.log(`Created .gitignore with ${respecEntry}`);
  }
}
